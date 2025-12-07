import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import { FileMdIcon, GraphIcon } from "@phosphor-icons/react"

const rootElement = document.getElementById("root")!

function Document() {
  const markdownPathname = `${location.pathname}${location.pathname.endsWith("/") ? "index" : ""}.md`

  return (
    <div>
      <div className="p-2 sticky top-0 flex gap-2 justify-end border-b border-zinc-200 bg-white">
        <a>
          <GraphIcon size={24} />
        </a>
        <a href={markdownPathname}>
          <FileMdIcon size={24} />
        </a>
      </div>
      <div className="mx-auto px-4 py-8 prose prose-zinc" dangerouslySetInnerHTML={{ __html: rootElement.innerHTML }} />
    </div>
  )
}

createRoot(rootElement).render(
  <StrictMode>
    <Document />
  </StrictMode>,
)
