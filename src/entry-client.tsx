/// <reference types="vite/client" />

import { hydrateRoot } from "react-dom/client"
import "./index.css"
import App from "./App.tsx"

hydrateRoot(document, <App />)
