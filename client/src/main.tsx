import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"

const rootElement = document.getElementById("root")!

createRoot(rootElement).render(
  <StrictMode>
    <div dangerouslySetInnerHTML={{ __html: rootElement.innerHTML }} />
  </StrictMode>,
)
