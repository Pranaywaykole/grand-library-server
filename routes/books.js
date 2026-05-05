/* ================================
   routes/books.js
   All book-related API endpoints.
   The most important route is
   /api/books/:id/text which fetches
   full book text from Gutenberg
   server-to-server — no CORS issues.
   ================================ */

const express = require('express')
const router  = express.Router()

/*
  node-fetch is needed in older Node.js versions.
  In Node 18+ you can use fetch() natively.
  We use the built-in fetch here.
*/


/* ─────────────────────────────────
   GET /api/books
   Search and browse books from
   Gutendex API.
   Accepts: ?search=, ?topic=, ?page=
   ───────────────────────────────── */

router.get('/', async (req, res, next) => {
  try {
    const { search, topic, page } = req.query

    /*
      Build the Gutendex URL from query params.
      req.query contains URL query parameters.
      If React calls /api/books?search=sherlock
      then req.query = { search: "sherlock" }
    */
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (topic)  params.set('topic',  topic)
    if (page)   params.set('page',   page)

    const qs  = params.toString()
    const url = qs
      ? `https://gutendex.com/books?${qs}`
      : `https://gutendex.com/books`

    /*
      This fetch runs on the SERVER — not in the browser.
      Server-to-server requests are never blocked by CORS.
      Gutenberg allows requests from servers freely.
    */
    const response = await fetch(url)
    if (!response.ok) {
      throw Object.assign(new Error('Gutendex API error'), { statusCode: 502 })
    }

    const data = await response.json()

    res.json(data)

  } catch (error) {
    next(error)
  }
})


/* ─────────────────────────────────
   GET /api/books/:id
   Get details for one specific book.
   ───────────────────────────────── */

router.get('/:id', async (req, res, next) => {
  try {
    /*
      req.params contains URL path parameters.
      If the URL is /api/books/1342
      then req.params = { id: "1342" }
    */
    const { id } = req.params

    const response = await fetch(`https://gutendex.com/books/${id}`)
    if (!response.ok) {
      throw Object.assign(new Error('Book not found'), { statusCode: 404 })
    }

    const book = await response.json()
    res.json(book)

  } catch (error) {
    next(error)
  }
})


/* ─────────────────────────────────
   GET /api/books/:id/text
   THIS IS THE KEY ENDPOINT.

   Fetches the full plain text of a
   Gutenberg book server-to-server.
   Returns the cleaned text ready
   for display in your reader.

   This permanently solves the CORS
   problem from Phase 2.
   ───────────────────────────────── */

router.get('/:id/text', async (req, res, next) => {
  try {
    const { id } = req.params

    /* First get the book metadata to find text URLs */
    const metaResponse = await fetch(`https://gutendex.com/books/${id}`)
    if (!metaResponse.ok) {
      throw Object.assign(new Error('Book not found'), { statusCode: 404 })
    }

    const book    = await metaResponse.json()
    const formats = book.formats

    /*
      Try text format URLs in order of preference.
      We try multiple because not every book has
      every format available.
    */
    const textFormatKeys = [
      'text/plain; charset=utf-8',
      'text/plain; charset=us-ascii',
      'text/plain',
    ]

    let textUrl = null
    for (const key of textFormatKeys) {
      if (formats[key]) {
        textUrl = formats[key]
        break
      }
    }

    /*
      Also try the standard Gutenberg URL pattern
      as a fallback.
    */
    if (!textUrl) {
      textUrl = `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`
    }

    /*
      Fetch the actual book text.
      This works perfectly because it is
      a server making the request — not a browser.
      Gutenberg never blocks server requests.
    */
    const textResponse = await fetch(textUrl)

    if (!textResponse.ok) {
      /*
        Try alternative URL patterns if first fails
      */
      const altUrl  = `https://www.gutenberg.org/files/${id}/${id}-0.txt`
      const altResp = await fetch(altUrl)

      if (!altResp.ok) {
        throw Object.assign(
          new Error('Book text not available'),
          { statusCode: 404 }
        )
      }

      const altText = await altResp.text()
      const cleaned = cleanBookText(altText)

      return res.json({
        bookId: id,
        title:  book.title,
        text:   cleaned,
        length: cleaned.length,
      })
    }

    const rawText = await textResponse.text()
    const cleaned = cleanBookText(rawText)

    res.json({
      bookId: id,
      title:  book.title,
      text:   cleaned,
      length: cleaned.length,
    })

  } catch (error) {
    next(error)
  }
})


/* ─────────────────────────────────
   HELPER — Clean Gutenberg Text
   Strips the legal header and footer
   that every Gutenberg book has.
   ───────────────────────────────── */

function cleanBookText(rawText) {
  let text = rawText

  const startPatterns = [
    /\*{3}\s*START OF (THE PROJECT GUTENBERG|THIS PROJECT GUTENBERG).*?\*{3}/i,
    /\*\*\* START OF THE PROJECT GUTENBERG EBOOK.*?\*\*\*/i,
  ]

  for (const pattern of startPatterns) {
    const match = text.match(pattern)
    if (match) {
      text = text.slice(match.index + match[0].length)
      break
    }
  }

  const endPatterns = [
    /\*{3}\s*END OF (THE PROJECT GUTENBERG|THIS PROJECT GUTENBERG).*?\*{3}/i,
    /\*\*\* END OF THE PROJECT GUTENBERG EBOOK.*?\*\*\*/i,
    /End of (the )?Project Gutenberg/i,
  ]

  for (const pattern of endPatterns) {
    const match = text.match(pattern)
    if (match) {
      text = text.slice(0, match.index)
      break
    }
  }

  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()
}

module.exports = router