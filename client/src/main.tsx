import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import { LanguagesIcon, FileDownIcon, PictureInPictureIcon, ChevronDownIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

function processLanguage(id: string): { id: string, displayName: string, pathname: string } {
  return {
    id,
    displayName: new Intl.DisplayNames(id, { type: "language" }).of(id)!,
    pathname: `/${id}${location.pathname.substring(location.pathname.indexOf("/", 1))}`,
  }
}

const rootElement = document.getElementById("root")!
const currentLanguage = processLanguage(document.documentElement.lang)
const availableLanguages = rootElement.dataset.languages!.split(" ").map(processLanguage)
const originalHtml = rootElement.innerHTML

const markdownPathname = `${location.pathname}${location.pathname.endsWith("/") ? "index" : ""}.md`

// async function summarize(text: string): Promise<ReadableStream<string> | undefined> {
//   if (!("Summarizer" in window)) { return undefined }
//
//   const options: SummarizerCreateCoreOptions = {
//     type: "tldr",
//     format: "plain-text",
//     outputLanguage: navigator.language,
//   }
//   const availability = await Summarizer.availability(options)
//   if (availability === "unavailable") { return undefined }
//
//   if (navigator.userActivation.isActive) {
//     const summarizer = await Summarizer.create(options)
//     return summarizer.summarizeStreaming(text)
//   }
// }
//
// async function checkTranslatorAvailability(text: string): Promise<TranslatorCreateCoreOptions | undefined> {
//   if (!("LanguageDetector" in window)) { return undefined }
//   if (!("Translator" in window)) { return undefined }
//
//   const detector = await LanguageDetector.create()
//   const result = (await detector.detect(text))[0]
//   if (result === undefined) { return undefined }
//
//   const { detectedLanguage: sourceLanguage } = result
//   if (sourceLanguage === undefined) { return undefined }
//   const targetLanguage = navigator.language
//
//   const availability = await Translator.availability({ sourceLanguage, targetLanguage })
//   if (availability === "unavailable") { return undefined }
//
//   return { sourceLanguage, targetLanguage }
// }
//
// async function translate(text: string, options: TranslatorCreateCoreOptions): Promise<string | undefined> {
//   const translator = await Translator.create(options)
//   const translatedText = await translator.translate(text)
//   return translatedText
// }

function Document() {
  return (
    <div>
      <div className="p-2 sticky top-0 flex gap-2 justify-end border-b border-zinc-200 bg-white">
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
      </div>
      <div
        className="mx-auto px-4 py-8 prose prose-zinc"
        dangerouslySetInnerHTML={{ __html: originalHtml }}
      />
    </div>
  )
}

createRoot(rootElement).render(
  <StrictMode>
    <Document />
  </StrictMode>,
)
