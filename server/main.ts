import { Command } from "@commander-js/extra-typings"
import { unified, type Plugin, type Processor } from "unified"
import { find } from "unist-util-find"
import chokidar from "chokidar"
import crypto from "node:crypto"
import fs from "node:fs/promises"
import http from "node:http"
import path from "node:path"
import url from "node:url"
import rehypeDocument from "rehype-document"
import rehypeSlug from "rehype-slug"
import rehypeAutolinkHeadings from "rehype-autolink-headings"
import rehypeMeta from "rehype-meta"
import rehypeStringify from "rehype-stringify"
import remarkGfm from "remark-gfm"
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import sirv from "sirv"
import stringWidth from "string-width"
import type { Node, Element } from "hast"
import z from "zod"

const configSchema = z.object({
  $schema: z.string().default("./.mdgraph/schema.json"),
  src: z.string().default("src"),
  out: z.string().default("out"),
  base: z.string().default("/"),
  port: z.number().default(3000),
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

const wrapWithRoot: Plugin = () => {
  return (tree: Node) => {
    return { type: "element", tagName: "div", properties: { id: "root" }, children: [tree] }
  }
}

const eventSourceEndpoint = "/event"

const injectAssets: (mode: "development" | "production", base: string) => Plugin = (mode, base) => () => {
  base = mode === "production" ? base : "/"
  return (tree: Node) => {
    const headNode = find<Element>(tree, { tagName: "head" })!
    headNode.children.push(
      { type: "element", tagName: "script", properties: { type: "module", src: `${base}index.js` }, children: [] },
      { type: "element", tagName: "link", properties: { rel: "stylesheet", href: `${base}index.css` }, children: [] },
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

async function generate({ src, out }: Config, processor: Processor<any, any, any, any, any>, input: string, onGenerate?: (pathname: string) => void) {
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

function createProcessor(mode: "development" | "production", base: string) {
  return unified()
    .use(remarkParse)
    .use(remarkGfm, { stringLength: stringWidth })
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, { behavior: "wrap" })
    .use(wrapWithRoot)
    .use(rehypeDocument)
    .use(rehypeMeta, { og: true, type: "article" })
    .use(injectAssets(mode, base))
    .use(rehypeStringify)
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

  const processor = createProcessor("production", config.base)

  for await (const input of fs.glob(path.join(config.src, "**/*.md"))) {
    await generate(config, processor, input)
  }

  console.log("Build completed")
}

async function serve(config: Config) {
  await generateAssets(config)

  const processor = createProcessor("development", config.base)

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
    .on("add", (path) => void generate(config, processor, path, sendEventToAll))
    .on("change", (path) => void generate(config, processor, path, sendEventToAll))
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
