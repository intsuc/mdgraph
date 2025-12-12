#!/usr/bin/env node

import { Command } from "@commander-js/extra-typings"
import { find } from "unist-util-find"
import { fromHtmlIsomorphic } from "hast-util-from-html-isomorphic"
import { NodeCompiler as TypstCompiler } from "@myriaddreamin/typst-ts-node-compiler"
import { unified, type Plugin } from "unified"
import { visitParents } from "unist-util-visit-parents"
import chokidar from "chokidar"
import crypto from "node:crypto"
import fs from "node:fs/promises"
import http from "node:http"
import path from "node:path"
import rehypeAutolinkHeadings from "rehype-autolink-headings"
import rehypeDocument from "rehype-document"
import rehypeMeta from "rehype-meta"
import rehypePresetMinify from "rehype-preset-minify"
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

async function generateAssets({ out }: Config) {
  const assetsUrl = import.meta.resolve("mdgraph-client/dist/assets")
  const assetsPath = url.fileURLToPath(assetsUrl)
  await fs.mkdir(out, { recursive: true })
  const files = await fs.readdir(assetsPath)
  for (const file of files) {
    const srcPath = path.join(assetsPath, file)
    const outPath = path.join(out, file)
    await fs.copyFile(srcPath, outPath)
  }
}

const rehypeTypst: Plugin = () => {
  const typstCompiler = TypstCompiler.create()
  return (tree) => {
    visitParents(tree, (node) => "tagName" in node && node.tagName === "code", (node, ancestors) => {
      const codeElement = node as Element
      const codeClassNames = codeElement.properties.className
      if (!Array.isArray(codeClassNames) || !codeClassNames.includes("language-math")) {
        return
      }
      delete codeElement.properties.className
      if (codeElement.children[0]?.type !== "text") {
        return
      }
      const codeValue = codeElement.children[0].value

      let targetElement: Element
      let display: "block" | "inline"
      const parentElement = ancestors[ancestors.length - 1]! as Element
      if (parentElement.type === "element" && parentElement.tagName === "pre") {
        display = "block"
        targetElement = parentElement
      } else {
        display = "inline"
        targetElement = codeElement
      }

      try {
        const typstResult = typstCompiler.compile({
          mainFileContent: `
#set page(height: auto, width: auto, margin: 0pt)
$${codeValue}$
`,
        })
        const svgValue = typstCompiler.svg(typstResult.result!)
        const svgElement = fromHtmlIsomorphic(svgValue, { fragment: true }).children[0]! as Element
        const width = parseFloat(svgElement.properties.dataWidth as string)
        const height = parseFloat(svgElement.properties.dataHeight as string)
        svgElement.properties.width = `${width / 11}em`
        svgElement.properties.height = `${height / 11}em`
        svgElement.properties.style = display === "inline" ? "display: inline-block;" : "display: block;"
        Object.assign(targetElement, svgElement)
      } catch (e) {
        targetElement.properties.style = "color: red;"
      }
    })
  }
}

const wrapWithRoot: Plugin<[Config]> = ({ languages }: Config) => {
  return (tree) => {
    return { type: "element", tagName: "div", properties: { id: "root", "data-languages": languages }, children: [tree] }
  }
}

const eventSourceEndpoint = "/event"

const injectAssets: Plugin<[mode: "development" | "production", base: string]> = (mode, base) => {
  base = mode === "production" ? base : "/"
  return (tree) => {
    const headNode = find<Element>(tree, { tagName: "head" })!
    headNode.children.push(
      { type: "element", tagName: "script", properties: { type: "module", src: `${base}index.js` }, children: [] },
    )

    if (mode === "development") {
      headNode.children.push({
        type: "element", tagName: "script", properties: { type: "module" }, children: [
          {
            type: "text",
            value: `(()=>{new EventSource("${eventSourceEndpoint}").onmessage=(e)=>{if(e.data===location.pathname){location.reload()}}})()`,
          },
        ],
      })
    }
  }
}

function createProcessor(mode: "development" | "production", language: string, config: Config) {
  const base = mode === "production" ? config.base : "/"
  return unified()
    .use(remarkParse)
    .use(remarkMath)
    .use(remarkGfm, { stringLength: stringWidth })
    .use(remarkRehype)
    .use(rehypeTypst)
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, { behavior: "prepend", content: [{ type: "element", tagName: "span", properties: { style: "margin-right: 0.25em;" }, children: [{ type: "text", value: "#" }] }] })
    .use(wrapWithRoot, config)
    .use(rehypeDocument, { css: `${base}index.css`, language })
    .use(rehypeMeta, { og: true, type: "article" })
    .use(injectAssets, mode, base)
    .use(rehypePresetMinify)
    .use(rehypeStringify)
}

function createProcessors(mode: "development" | "production", config: Config): Record<string, ReturnType<typeof createProcessor>> {
  const processors: Record<string, ReturnType<typeof createProcessor>> = {}
  for (const language of config.languages) {
    processors[language] = createProcessor(mode, language, config)
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
  await generateAssets(config)

  const processors = createProcessors("production", config)

  for await (const input of fs.glob(path.join(config.src, "**/*.md"))) {
    await generate(config, processors, input)
  }

  console.log("Build completed")
}

async function serve(config: Config) {
  await generateAssets(config)

  const processors = createProcessors("development", config)

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
