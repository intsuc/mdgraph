/// <reference types="vite/client" />

import { hydrateRoot } from "react-dom/client"
import "./index.css"
import Document from "./Document.tsx"

hydrateRoot(document, <Document />)
