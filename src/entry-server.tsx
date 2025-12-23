import { Command } from "@commander-js/extra-typings"
import { find } from "unist-util-find"
import { h } from "hastscript"
import { prerenderToNodeStream } from "react-dom/static"
import { toc as rehypeToc } from "@jsdevtools/rehype-toc"
import { unified, type Plugin } from "unified"
import Document from "./Document"
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
import type { LanguageInput } from "@shikijs/types"
import type { ReactNode } from "react"
import url from "node:url"
import z from "zod"

const configSchema = z.object({
  $schema: z.string().default("./.mdgraph/schema.json"),
  src: z.string().default("src"),
  syntaxes: z.string().default("syntaxes"),
  themes: z.object({
    light: z.string().default("vitesse-light"),
    dark: z.string().default("vitesse-dark"),
  }).default({
    light: "vitesse-light",
    dark: "vitesse-dark",
  }),
  out: z.string().default("out"),
  base: z.string().default("/"),
  port: z.number().default(3000),
  languages: z.array(z.string()).min(1).default(["en"]),
  defaultLanguage: z.string().default("en"),
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

const htmlProcessor = unified()
  .use(rehypeDocument)
  .use(rehypePresetMinify)
  .use(rehypeStringify)

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

  await fs.writeFile(path.join(out, "404.html"), String(htmlProcessor.stringify({
    type: "root",
    children: [{ type: "text", value: "404" }],
  })))

  return {
    js: files.find((file) => file.endsWith(".js"))!,
    css: files.find((file) => file.endsWith(".css"))!,
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
  document.getElementById("root").style.setProperty(
    "--sidebar-width",
    window.innerWidth < 768 || localStorage.getItem("sidebar-state") === "collapsed" ? "0" : "16rem",
  )
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

function createProcessor(mode: "development" | "production", assets: Assets, language: string, langs: LanguageInput[], config: Config) {
  const base = mode === "production" ? config.base : "/"
  return unified()
    .use(remarkParse)
    .use(remarkMath)
    .use(remarkGfm, {
      stringLength: stringWidth,
    })
    .use(remarkRehype)
    .use(rehypeMathjax)
    .use(rehypeShiki, {
      inline: "tailing-curly-colon",
      themes: config.themes,
      langs,
    })
    .use(rehypeSlug)
    .use(rehypeToc, {
      headings: ["h1", "h2", "h3"],
      cssClasses: { toc: "hidden" },
    })
    .use(rehypeInferTitleMeta)
    .use(rehypeAutolinkHeadings, {
      behavior: "prepend",
      content: [h("span", { style: "margin-right: 0.25em;" }, "#")],
    })
    .use(rehypeDocument, { language })
    .use(rehypeMeta, {
      og: true,
      type: "article",
    })
    .use(injectAssets, mode, base, assets)
    .use(rehypePresetMinify)
    .use(rehypeStringify)
}

async function createProcessors(mode: "development" | "production", assets: Assets, config: Config): Promise<Record<string, ReturnType<typeof createProcessor>>> {
  const files = await fs.readdir(config.syntaxes)
  const langs: LanguageInput[] = await Promise.all(files.map(async (file) => {
    // TODO: validate
    return JSON.parse(await fs.readFile(path.join(config.syntaxes, file), "utf8"))
  }))

  const processors: Record<string, ReturnType<typeof createProcessor>> = {}
  for (const language of config.languages) {
    processors[language] = createProcessor(mode, assets, language, langs, config)
  }
  return processors
}

async function generate({ src, out, defaultLanguage }: Config, processors: Awaited<ReturnType<typeof createProcessors>>, input: string, onGenerate?: (pathname: string) => void) {
  const document = await fs.readFile(input, "utf8")
  const parts = path.relative(src, input).split(path.sep)
  const language = parts[0]!
  const file = await processors[language]!.process(document)

  const outPathWithoutExt = input.replace(src, out).replace(/\.md$/, "")
  const outPath = `${outPathWithoutExt}.html`
  await fs.mkdir(path.dirname(outPath), { recursive: true })

  await fs.copyFile(input, input.replace(src, out))
  await fs.writeFile(outPath, String(file), "utf8")

  const pathname = path.relative(out, outPathWithoutExt).replace(/\\/g, "/").replace(/index$/, "")

  if (language === defaultLanguage) {
    const string = htmlProcessor.stringify({
      type: "root",
      children: [h("html", [
        h("head", [
          h("link", { rel: "canonical", href: `/${path.relative(out, outPath).replace(/\\/g, "/")}` }),
          h("meta", { httpEquiv: "refresh", content: `0;url=${pathname}` }),
        ])
      ])],
    })
    const redirectOutPath = path.join(out, path.relative(path.join(src, defaultLanguage), input).replace(/\.md$/, ".html"))
    await fs.writeFile(redirectOutPath, string, "utf8")
  }

  onGenerate?.(`/${pathname}`)
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

async function clean(config: Config) {
  await fs.rm(config.out, { recursive: true, force: true })
}

async function build(config: Config) {
  const assets = await generateAssets(config)

  const processors = await createProcessors("production", assets, config)

  for await (const input of fs.glob(path.join(config.src, "**/*.md"))) {
    await generate(config, processors, input)
  }

  console.log("Build completed")
}

async function serve(config: Config) {
  const assets = await generateAssets(config)

  const processors = await createProcessors("development", assets, config)

  const clients: Record<string, http.ServerResponse> = {}
  function sendEventToAll(pathname: string) {
    for (const client of Object.values(clients)) {
      client.write(`data: ${pathname}\n\n`)
    }
  }

  const handler = sirv(config.out, {
    dev: true,
    onNoMatch(req, res) {
      req.url = "/404.html"
      handler(req, res)
    },
  })
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
  .command("clean")
  .action(async () => {
    const config = await getConfig()
    await clean(config)
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

// async function renderToString(bootstrapModule: string, reactNode: ReactNode): Promise<string> {
//   const { prelude } = await prerenderToNodeStream(reactNode, {
//     bootstrapModules: [bootstrapModule],
//   })
//
//   return new Promise((resolve, reject) => {
//     let data = ""
//     prelude.on("data", chunk => {
//       data += chunk
//     })
//     prelude.on("end", () => resolve(data))
//     prelude.on("error", reject)
//   })
// }
//
// const manifest = JSON.parse(await fs.readFile("dist/client/.vite/manifest.json", "utf8"))
// const js = manifest["index.html"].file as string
// const css = manifest["index.html"].css[0] as string
// const string = await renderToString(js, <App css={css} />)
//
// await fs.rm("dist/all", { recursive: true, force: true })
// await fs.mkdir("dist/all", { recursive: true })
// await fs.writeFile("dist/all/index.html", string)
//
// await fs.mkdir("dist/all/assets", { recursive: true })
// await fs.copyFile("dist/client/" + js, "dist/all/" + js)
// await fs.copyFile("dist/client/" + css, "dist/all/" + css)
