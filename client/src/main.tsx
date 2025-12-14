import { StrictMode, useState } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import { LanguagesIcon, FileDownIcon, PictureInPictureIcon, ChevronDownIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ThemeProvider } from "./components/theme-provider"
import { ModeToggle } from "./components/mode-toggle"
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarProvider, SidebarRail, SidebarTrigger } from "@/components/ui/sidebar"

const rootElement = document.getElementById("root")!
const headerElement = document.getElementById("header")!
const mainElement = document.getElementById("main")!
const tocElement = mainElement.removeChild(mainElement.firstElementChild!)!

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

const markdownPathname = `${location.pathname}${location.pathname.endsWith("/") ? "index" : ""}.md`

type TocItem = {
  href: string,
  heading: string,
  children: TocItem[],
}

function toTocItem(element: HTMLLIElement): TocItem {
  const anchorElement = element.querySelector("a")!
  const children: TocItem[] = []
  for (const chid of element.querySelector("ol")?.children ?? []) {
    children.push(toTocItem(chid as HTMLLIElement))
  }
  return {
    href: anchorElement.href,
    heading: anchorElement.textContent,
    children,
  }
}
const tocTreeItem = toTocItem(tocElement.firstElementChild!.firstElementChild as HTMLLIElement)!

function Toc({ item }: { item: TocItem }) {
  if (item.children.length > 0) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild className="h-auto!">
          <a href={item.href}>
            {item.heading}
          </a>
        </SidebarMenuButton>
        <SidebarMenuSub>
          {item.children.map((subItem, index) => (
            <Toc key={index} item={subItem} />
          ))}
        </SidebarMenuSub>
      </SidebarMenuItem>
    )
  } else {
    return (
      <SidebarMenuButton asChild className="h-auto!">
        <a href={item.href}>
          {item.heading}
        </a>
      </SidebarMenuButton>
    )
  }
}

function Document() {
  const [defaultOpen] = useState(() => {
    const sidebarState = localStorage.getItem("sidebar_state")
    switch (sidebarState) {
      case "expanded": return true
      case "collapsed": return false
      default: return true
    }
  })

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <Sidebar>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <Toc item={tocTreeItem} />
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <div id="header" className="p-2 h-13 sticky top-0 flex items-center justify-between bg-background">
          <div>
            <SidebarTrigger />
          </div>
          <div className="flex gap-2">
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
        </div>
        <div
          className="mx-auto px-4 py-8 prose prose-zinc dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: mainElement.innerHTML }}
        />
      </SidebarInset>
    </SidebarProvider>
  )
}

createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider storageKey="ui-theme">
      <Document />
    </ThemeProvider>
  </StrictMode>
)
