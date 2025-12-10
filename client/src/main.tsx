import { StrictMode, useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import { LanguagesIcon, FileDownIcon, PictureInPictureIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

const rootElement = document.getElementById("root")!
const originalText = rootElement.innerText
const originalHtml = rootElement.innerHTML

async function summarize(text: string): Promise<ReadableStream<string> | undefined> {
  if (!("Summarizer" in window)) { return undefined }

  const options: SummarizerCreateCoreOptions = {
    type: "tldr",
    format: "plain-text",
    outputLanguage: navigator.language,
  }
  const availability = await Summarizer.availability(options)
  if (availability === "unavailable") { return undefined }

  if (navigator.userActivation.isActive) {
    const summarizer = await Summarizer.create(options)
    return summarizer.summarizeStreaming(text)
  }
}

async function checkTranslatorAvailability(text: string): Promise<TranslatorCreateCoreOptions | undefined> {
  if (!("LanguageDetector" in window)) { return undefined }
  if (!("Translator" in window)) { return undefined }

  const detector = await LanguageDetector.create()
  const result = (await detector.detect(text))[0]
  if (result === undefined) { return undefined }

  const { detectedLanguage: sourceLanguage } = result
  if (sourceLanguage === undefined) { return undefined }
  const targetLanguage = navigator.language

  const availability = await Translator.availability({ sourceLanguage, targetLanguage })
  if (availability === "unavailable") { return undefined }

  return { sourceLanguage, targetLanguage }
}

async function translate(text: string, options: TranslatorCreateCoreOptions): Promise<string | undefined> {
  const translator = await Translator.create(options)
  const translatedText = await translator.translate(text)
  return translatedText
}

function Document() {
  const markdownPathname = `${location.pathname}${location.pathname.endsWith("/") ? "index" : ""}.md`

  const [translatorOptions, setTranslatorOptions] = useState<TranslatorCreateCoreOptions | undefined>(undefined)
  useEffect(() => {
    void (async () => {
      const translatorOptions = await checkTranslatorAvailability(originalText)
      setTranslatorOptions(translatorOptions)
    })()
  }, [])

  return (
    <div>
      <div className="p-2 sticky top-0 flex gap-2 justify-end border-b border-zinc-200 bg-white">
        <Button
          variant="outline"
          size="icon"
          title="Translate"
          aria-label="Translate"
          disabled={translatorOptions === undefined}
          onClick={() => {
            void (async () => {
              if (translatorOptions === undefined) { return }
              const result = await translate(originalText, translatorOptions)
              console.log(originalText)
              console.log(result)
            })()
          }}
          className="disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <LanguagesIcon />
        </Button>
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
