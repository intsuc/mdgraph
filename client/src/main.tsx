import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import { FileMdIcon, GraphIcon } from "@phosphor-icons/react"

const rootElement = document.getElementById("root")!

function Document() {
  const markdownPathname = `${location.pathname}${location.pathname.endsWith("/") ? "index" : ""}.md`

  return (
    <div>
      <div className="p-1 sticky top-0 flex gap-1 justify-end border-b border-zinc-200 bg-white">
        <a>
          <GraphIcon size={20} />
        </a>
        <a href={markdownPathname}>
          <FileMdIcon size={20} />
        </a>
      </div>
      <div className="mx-auto my-8 prose prose-zinc" dangerouslySetInnerHTML={{ __html: rootElement.innerHTML }} />
    </div>
  )
}

createRoot(rootElement).render(
  <StrictMode>
    <Document />
  </StrictMode>,
)
