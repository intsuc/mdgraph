import { StrictMode, useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import { FileMdIcon, GraphIcon, TranslateIcon } from "@phosphor-icons/react"

const rootElement = document.getElementById("root")!
const originalHtml = rootElement.innerHTML

async function checkTranslatorAvailability(text: string): Promise<{
  sourceLanguage: string,
  targetLanguage: string,
} | undefined> {
  if (!("LanguageDetector" in window)) { return undefined }

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

async function translate(text: string): Promise<string | undefined> {
  if (!("LanguageDetector" in window)) { return undefined }

  const detector = await LanguageDetector.create()
  const result = (await detector.detect(text))[0]
  if (result === undefined) { return undefined }

  const { detectedLanguage: sourceLanguage } = result
  if (sourceLanguage === undefined) { return undefined }
  const targetLanguage = navigator.language

  const availability = await Translator.availability({ sourceLanguage, targetLanguage })
  if (availability === "unavailable") { return undefined }

  const translator = await Translator.create({ sourceLanguage, targetLanguage })
  const translatedText = await translator.translate(text)

  return translatedText
}

const text = "Hello, world!"

function Document() {
  const markdownPathname = `${location.pathname}${location.pathname.endsWith("/") ? "index" : ""}.md`

  const [canTranslate, setCanTranslate] = useState(false)
  useEffect(() => {
    void (async () => {
      const availability = await checkTranslatorAvailability(text)
      setCanTranslate(availability !== undefined)
    })()
  }, [])

  return (
    <div>
      <div className="p-2 sticky top-0 flex gap-2 justify-end border-b border-zinc-200 bg-white">
        <button
          title="Translate"
          aria-label="Translate"
          disabled={!canTranslate}
          onClick={() => {
            void (async () => {
              const result = await translate(text)
              console.log(text, result)
            })()
          }}
          className="disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <TranslateIcon size={24} />
        </button>
        <a
          title="View in Graph"
          aria-label="View in Graph"
        >
          <GraphIcon size={24} />
        </a>
        <a
          title="View in Markdown"
          aria-label="View in Markdown"
          href={markdownPathname}
        >
          <FileMdIcon size={24} />
        </a>
      </div>
      <div className="mx-auto px-4 py-8 prose prose-zinc" dangerouslySetInnerHTML={{ __html: originalHtml }} />
    </div>
  )
}

createRoot(rootElement).render(
  <StrictMode>
    <Document />
  </StrictMode>,
)
