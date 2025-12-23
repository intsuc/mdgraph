import { useState, type ReactNode } from "react"
import "./index.css"
import { PictureInPictureIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeProvider } from "./components/theme-provider"
import { ModeToggle } from "./components/mode-toggle"
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarInset, SidebarMenu, SidebarProvider, SidebarRail, SidebarTrigger } from "@/components/ui/sidebar"

export default function Document({
  lang,
  css,
  children,
}: {
  lang?: string,
  css?: string,
  children?: ReactNode,
}) {
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
                  <Button
                    variant="outline"
                    size="icon"
                    asChild
                  >
                    <a title="View in Graph" aria-label="View in Graph">
                      <PictureInPictureIcon size={24} />
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
