import { useState } from "react"
import { Button } from "@/components/ui/button"

export default function App({ css }: { css?: string }) {
  const [count, setCount] = useState(0)

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href={css}></link>
        <title>My app</title>
      </head>
      <body>
        <Button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </Button>
      </body>
    </html>
  )
}
