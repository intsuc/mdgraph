/// <reference types="vite/client" />

import { hydrateRoot } from "react-dom/client"
import "./index.css"
import Document from "./Document.tsx"

const contentElement = document.getElementById("main")!

hydrateRoot(
  document,
  <Document>
    <div
      id="main"
      className="mx-auto px-4 py-8 prose prose-zinc dark:prose-invert"
      dangerouslySetInnerHTML={{ __html: contentElement.innerHTML }}
    />
  </Document>,
)
