#!/usr/bin/env node

import { Command } from "@commander-js/extra-typings"
import { unified, type Plugin, type Processor } from "unified"
import chokidar from "chokidar"
import crypto from "node:crypto"
import fs from "node:fs/promises"
import http from "node:http"
import path from "node:path"
import url from "node:url"
import rehypeDocument from "rehype-document"
import rehypeStringify from "rehype-stringify"
import remarkGfm from "remark-gfm"
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import sirv from "sirv"
import stringWidth from "string-width"
import type { Node } from "hast"

const src = path.join(process.cwd(), "src")
const out = path.join(process.cwd(), "out")

async function generateAssets() {
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

const wrapWithRoot: Plugin = () => {
  return (tree: Node) => {
    return {
      type: "element", tagName: "div", properties: { id: "root" }, children: [tree],
    }
  }
}

const eventSourceEndpoint = "/event"

async function generate(processor: Processor<any, any, any, any, any>, input: string, onGenerate?: (pathname: string) => void) {
  const document = await fs.readFile(input, "utf8")
  const file = await processor.process(document)

  const outPathWithoutExt = input.replace(src, out).replace(/\.md$/, "")
  const outPath = `${outPathWithoutExt}.html`
  await fs.mkdir(path.dirname(outPath), { recursive: true })

  await fs.copyFile(input, input.replace(src, out))
  await fs.writeFile(outPath, String(file), "utf8")

  const pathname = `/${path.relative(out, outPathWithoutExt).replace(/\\/g, "/").replace(/index$/, "")}`
  onGenerate?.(pathname)
}

function createProcessor(mode: "development" | "production") {
  return unified()
    .use(remarkParse)
    .use(remarkGfm, { stringLength: stringWidth })
    .use(remarkRehype)
    .use(wrapWithRoot)
    .use(rehypeDocument)
    .use(rehypeStringify)
}

async function init() {
  await Promise.all([
    fs.mkdir(src, { recursive: true }),
    fs.writeFile(path.join(process.cwd(), ".gitignore"), "/out/\n", "utf8"),
  ])
}

async function build() {
  await generateAssets()

  const processor = createProcessor("production")

  for await (const input of fs.glob(path.join(src, "**/*.md"))) {
    await generate(processor, input)
  }

  console.log("Build completed")
}

async function serve(port: number) {
  await generateAssets()

  const processor = createProcessor("development")

  const clients: Record<string, http.ServerResponse> = {}
  function sendEventToAll(pathname: string) {
    for (const client of Object.values(clients)) {
      client.write(`data: ${pathname}\n\n`)
    }
  }

  const handler = sirv(out, { dev: true })
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
  }).listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`)
  })

  chokidar.watch(src)
    .on("add", (path) => void generate(processor, path, sendEventToAll))
    .on("change", (path) => void generate(processor, path, sendEventToAll))
}

const program = new Command()

program
  .command("init")
  .action(() => {
    void init()
  })

program
  .command("build")
  .action(() => {
    void build()
  })

program
  .command("serve")
  .option("-p, --port <number>", "port number", "3000")
  .action((options) => {
    const port = parseInt(options.port)
    void serve(port)
  })

program.parse(process.argv)
