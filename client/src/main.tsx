import { StrictMode, useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import { FileMdIcon, GraphIcon, SparkleIcon, TranslateIcon } from "@phosphor-icons/react"

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

function Document() {
  const markdownPathname = `${location.pathname}${location.pathname.endsWith("/") ? "index" : ""}.md`

  const [summary, setSummary] = useState<string | undefined>(undefined)

  const [canTranslate, setCanTranslate] = useState(false)
  useEffect(() => {
    void (async () => {
      const availability = await checkTranslatorAvailability(originalText)
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
              const result = await translate(originalText)
              console.log(originalText)
              console.log(result)
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
      <div className="mx-auto px-4 py-8 prose prose-zinc">
        <div className="mb-4 p-2 border border-zinc-300 rounded bg-zinc-50">
          <button
            title="Summarize"
            aria-label="Summarize"
            onClick={() => {
              setSummary(undefined)
              void (async () => {
                const summary = await summarize(originalText)
                if (summary !== undefined) {
                  const reader = summary.getReader()
                  while (true) {
                    const { done, value } = await reader.read()
                    if (done) { break }
                    setSummary((prev) => (prev ?? "") + (value ?? ""))
                  }
                }
              })()
            }}
          >
            <SparkleIcon size={24} />
          </button>
          {summary !== undefined ? (
            <div className="text-left">{summary}</div>
          ) : null}
        </div>
        <div dangerouslySetInnerHTML={{ __html: originalHtml }} />
      </div>
    </div>
  )
}

createRoot(rootElement).render(
  <StrictMode>
    <Document />
  </StrictMode>,
)
