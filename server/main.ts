#!/usr/bin/env node

import { Command } from "@commander-js/extra-typings"
import { find } from "unist-util-find"
import { toc as rehypeToc } from "@jsdevtools/rehype-toc"
import { unified, type Plugin } from "unified"
import { h } from "hastscript"
import chokidar from "chokidar"
import crypto from "node:crypto"
import fs from "node:fs/promises"
import http from "node:http"
import path from "node:path"
import rehypeAutolinkHeadings from "rehype-autolink-headings"
import rehypeDocument from "rehype-document"
import rehypeInferTitleMeta from "rehype-infer-title-meta"
import rehypeMathjax from "rehype-mathjax"
import rehypeMeta from "rehype-meta"
import rehypePresetMinify from "rehype-preset-minify"
import rehypeShiki from "@shikijs/rehype"
import rehypeSlug from "rehype-slug"
import rehypeStringify from "rehype-stringify"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import sirv from "sirv"
import stringWidth from "string-width"
import type { Element } from "hast"
import url from "node:url"
import z from "zod"

const configSchema = z.object({
  $schema: z.string().default("./.mdgraph/schema.json"),
  src: z.string().default("src"),
  out: z.string().default("out"),
  base: z.string().default("/"),
  port: z.number().default(3000),
  languages: z.array(z.string()).min(1).default(["en"]),
})

type Config = z.infer<typeof configSchema>

async function getConfig(): Promise<Config> {
  try {
    return configSchema.parse(JSON.parse(await fs.readFile("mdgraph.json", "utf8")))
  } catch {
    return configSchema.parse({})
  }
}

type Assets = { js: string, css: string }

async function generateAssets({ out }: Config): Promise<Assets> {
  const assetsUrl = import.meta.resolve("./dist/assets/")
  const assetsPath = url.fileURLToPath(assetsUrl)
  await fs.mkdir(out, { recursive: true })
  const files = await fs.readdir(assetsPath)
  for (const file of files) {
    const srcPath = path.join(assetsPath, file)
    const outPath = path.join(out, file)
    await fs.copyFile(srcPath, outPath)
  }
  return {
    js: files.find((file) => file.endsWith(".js"))!,
    css: files.find((file) => file.endsWith(".css"))!,
  }
}

const wrapWithRoot: Plugin<[mode: "development" | "production", Config]> = (mode, { base, languages }: Config) => {
  base = mode === "production" ? base : "/"
  return (tree) => {
    return h("div#root", { "data-base": base, "data-languages": languages }, [
      h("div", { class: "flex w-full" }, [
        h("div", { class: "w-(--sidebar-width) h-screen bg-sidebar" }),
        h("main", { class: "flex-1" }, [
          h("div", { class: "p-2 h-13 sticky top-0 flex gap-2 justify-end bg-background" }),
          h("div#main", { class: "mx-auto px-4 py-8 prose prose-zinc dark:prose-invert" }, [tree as Element]),
        ]),
      ]),
    ])
  }
}

const eventSourceEndpoint = "/event"

const injectAssets: Plugin<[mode: "development" | "production", base: string, assets: Assets]> = (mode, base, assets) => {
  base = mode === "production" ? base : "/"
  return (tree) => {
    const headNode = find<Element>(tree, { tagName: "head" })!
    headNode.children.push(
      h("script", { type: "module" }, `
try{
  document.documentElement.classList.add(localStorage.getItem("ui-theme") ?? "light")
  document.getElementById("root").style.setProperty("--sidebar-width", localStorage.getItem("sidebar-state") === "collapsed" ? "0" : "16rem")
} catch (e) {
}
`),
      h("link", { rel: "stylesheet", href: `${base}${assets.css}` }),
      h("script", { type: "module", src: `${base}${assets.js}` }),
    )

    if (mode === "development") {
      headNode.children.push(
        h("script", { type: "module" }, `
(() => {
  new EventSource("${eventSourceEndpoint}").onmessage = (e) => {
    if (e.data === location.pathname) {
      location.reload()
    }
  }
})()
`),
      )
    }
  }
}

function createProcessor(mode: "development" | "production", assets: Assets, language: string, config: Config) {
  const base = mode === "production" ? config.base : "/"
  return unified()
    .use(remarkParse)
    .use(remarkMath)
    .use(remarkGfm, { stringLength: stringWidth })
    .use(remarkRehype)
    .use(rehypeMathjax)
    .use(rehypeShiki, { inline: "tailing-curly-colon", themes: { light: "vitesse-light", dark: "vitesse-dark" } })
    .use(rehypeSlug)
    .use(rehypeToc, { headings: ["h1", "h2", "h3"], cssClasses: { toc: "hidden" } })
    .use(rehypeInferTitleMeta)
    .use(rehypeAutolinkHeadings, { behavior: "prepend", content: [h("span", { style: "margin-right: 0.25em;" }, "#")] })
    .use(wrapWithRoot, mode, config)
    .use(rehypeDocument, { language })
    .use(rehypeMeta, { og: true, type: "article" })
    .use(injectAssets, mode, base, assets)
    .use(rehypePresetMinify)
    .use(rehypeStringify)
}

function createProcessors(mode: "development" | "production", assets: Assets, config: Config): Record<string, ReturnType<typeof createProcessor>> {
  const processors: Record<string, ReturnType<typeof createProcessor>> = {}
  for (const language of config.languages) {
    processors[language] = createProcessor(mode, assets, language, config)
  }
  return processors
}

async function generate({ src, out }: Config, processors: ReturnType<typeof createProcessors>, input: string, onGenerate?: (pathname: string) => void) {
  const document = await fs.readFile(input, "utf8")
  const language = path.relative(src, input).split(path.sep)[0]!
  const file = await processors[language]!.process(document)

  const outPathWithoutExt = input.replace(src, out).replace(/\.md$/, "")
  const outPath = `${outPathWithoutExt}.html`
  await fs.mkdir(path.dirname(outPath), { recursive: true })

  await fs.copyFile(input, input.replace(src, out))
  await fs.writeFile(outPath, String(file), "utf8")

  const pathname = `/${path.relative(out, outPathWithoutExt).replace(/\\/g, "/").replace(/index$/, "")}`
  onGenerate?.(pathname)
}

async function init() {
  await Promise.all([
    fs.mkdir(".mdgraph", { recursive: true }).then(() =>
      fs.writeFile(path.join(".mdgraph", "schema.json"), JSON.stringify(z.toJSONSchema(configSchema), null, 2) + "\n", "utf8")
    ),
    getConfig().then((config) =>
      fs.writeFile("mdgraph.json", JSON.stringify(config, null, 2) + "\n", "utf8")
    ),
    fs.mkdir("src", { recursive: true }),
    fs.mkdir("out", { recursive: true }),
    fs.writeFile(path.join(process.cwd(), ".gitignore"), "/.mdgraph/\n/out/\n", "utf8"),
  ])
}

async function build(config: Config) {
  const assets = await generateAssets(config)

  const processors = createProcessors("production", assets, config)

  for await (const input of fs.glob(path.join(config.src, "**/*.md"))) {
    await generate(config, processors, input)
  }

  console.log("Build completed")
}

async function serve(config: Config) {
  const assets = await generateAssets(config)

  const processors = createProcessors("development", assets, config)

  const clients: Record<string, http.ServerResponse> = {}
  function sendEventToAll(pathname: string) {
    for (const client of Object.values(clients)) {
      client.write(`data: ${pathname}\n\n`)
    }
  }

  const handler = sirv(config.out, { dev: true })
  http.createServer((req, res) => {
    switch (req.url) {
      case undefined: {
        res.statusCode = 400
        res.end("Bad request")
        return
      }
      case eventSourceEndpoint: {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        })
        res.write("\n")

        const id = crypto.randomUUID()
        clients[id] = res
        req.on("close", () => delete clients[id])

        return
      }
      default: {
        handler(req, res)
        return
      }
    }
  }).listen(config.port, () => {
    console.log(`Server is running at http://localhost:${config.port}`)
  })

  chokidar.watch(config.src)
    .on("add", (path) => void generate(config, processors, path, sendEventToAll))
    .on("change", (path) => void generate(config, processors, path, sendEventToAll))
}

const program = new Command()

program
  .command("init")
  .action(() => {
    void init()
  })

program
  .command("build")
  .action(async () => {
    const config = await getConfig()
    await build(config)
  })

program
  .command("serve")
  .action(async () => {
    const config = await getConfig()
    await serve(config)
  })

program.parse(process.argv)
