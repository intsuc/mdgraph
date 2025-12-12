import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import { LanguagesIcon, FileDownIcon, PictureInPictureIcon, ChevronDownIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ThemeProvider } from "./components/theme-provider"
import { ModeToggle } from "./components/mode-toggle"

const rootElement = document.getElementById("root")!
const base = rootElement.dataset.base!

function processLanguage(id: string): { id: string, displayName: string, pathname: string } {
  return {
    id,
    displayName: new Intl.DisplayNames(id, { type: "language" }).of(id)!,
    pathname: `${base}${id}${location.pathname.substring(location.pathname.indexOf("/", base.length))}`,
  }
}

const currentLanguage = processLanguage(document.documentElement.lang)
const availableLanguages = rootElement.dataset.languages!.split(" ").map(processLanguage)
const originalHtml = rootElement.innerHTML

const markdownPathname = `${location.pathname}${location.pathname.endsWith("/") ? "index" : ""}.md`

function Document() {
  return (
    <div>
      <div className="p-2 sticky top-0 flex gap-2 justify-end bg-background">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <LanguagesIcon />
              {currentLanguage.displayName}
              <ChevronDownIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              {availableLanguages.map(({ id, displayName, pathname }) => (
                <DropdownMenuItem
                  key={id}
                  disabled={id === currentLanguage.id}
                  asChild
                >
                  <a href={pathname}>
                    {displayName}
                  </a>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="outline"
          size="icon"
          asChild
        >
          <a
            title="View in Graph"
            aria-label="View in Graph"
          >
            <PictureInPictureIcon size={24} />
          </a>
        </Button>
        <Button
          variant="outline"
          size="icon"
          asChild
        >
          <a
            title="View in Markdown"
            aria-label="View in Markdown"
            href={markdownPathname}
          >
            <FileDownIcon size={24} />
          </a>
        </Button>
        <ModeToggle />
      </div>
      <div
        className="mx-auto px-4 py-8 prose prose-zinc dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: originalHtml }}
      />
    </div>
  )
}

createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider storageKey="ui-theme">
      <Document />
    </ThemeProvider>
  </StrictMode>,
)
