import { useState, type ReactNode } from "react"
import "./index.css"
import { ChevronDownIcon, FileDownIcon, LanguagesIcon, PictureInPictureIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ThemeProvider } from "./components/theme-provider"
import { ModeToggle } from "./components/mode-toggle"
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarInset, SidebarMenu, SidebarProvider, SidebarRail, SidebarTrigger } from "@/components/ui/sidebar"

export default function Document({
  lang,
  css,
  pathname = location.pathname,
  children,
}: {
  lang?: string,
  css?: string,
  pathname?: string,
  children?: ReactNode,
}) {
  const markdownPathname = `${pathname}${pathname.endsWith("/") ? "index" : ""}.md`

  const [defaultOpen] = useState(() => {
    const sidebarState = localStorage.getItem("sidebar-state")
    switch (sidebarState) {
      case "expanded": return true
      case "collapsed": return false
      default: return true
    }
  })

  return (
    <html lang={lang}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {css ? <link rel="stylesheet" href={css} /> : null}
      </head>
      <body>
        <ThemeProvider storageKey="ui-theme">
          <SidebarProvider defaultOpen={defaultOpen}>
            <Sidebar>
              <SidebarContent>
                <SidebarGroup>
                  <SidebarGroupContent>
                    <SidebarMenu>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
              <SidebarRail />
            </Sidebar>
            <SidebarInset>
              <div className="p-2 h-13 sticky top-0 flex items-center justify-between bg-background">
                <div>
                  <SidebarTrigger />
                </div>
                <div className="flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">
                        <LanguagesIcon />
                        {/* {currentLanguage.displayName} */}
                        <ChevronDownIcon />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuGroup>
                        {/* availableLanguages.map(({ id, displayName, pathname }) => (
                          <DropdownMenuItem
                            key={id}
                            disabled={id === currentLanguage.id}
                            asChild
                          >
                            <a href={pathname}>
                              {displayName}
                            </a>
                          </DropdownMenuItem>
                        )) */}
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="outline"
                    size="icon"
                    asChild
                  >
                    <a title="View in Graph" aria-label="View in Graph">
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
              {children}
            </SidebarInset>
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
