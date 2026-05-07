/* ================================
   routes/books.js — Updated
   Serves books from MongoDB cache.
   Falls back to Gutenberg only when
   book is not in database.
   ================================ */

const express = require("express");
const router = express.Router();
const Book = require("../models/Book");
const BookText = require("../models/BookText");

/* ─────────────────────────────────
   GET /api/books
   Serve from MongoDB — instant.
   ───────────────────────────────── */

router.get("/", async (req, res, next) => {
  try {
    const { search = "", topic = "", page = 1, limit = 32 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    /* Build MongoDB query */
    const query = {};

    if (search) {
      /*
        MongoDB text search across title and authors.
        $text uses the text index we defined in the schema.
        Fast even with thousands of books.
      */
      query.$text = { $search: search };
    }

    if (topic) {
      /*
        Case-insensitive search in subjects array.
        $regex with $options:'i' ignores case.
      */
      query.subjects = {
        $elemMatch: {
          $regex: topic,
          $options: "i",
        },
      };
    }

    /*
      Run count and find simultaneously using Promise.all.
      This is faster than running them one after another.
    */
    const [total, books] = await Promise.all([
      Book.countDocuments(query),
      Book.find(query)
        .sort({ downloadCount: -1 }) /* most popular first */
        .skip(skip)
        .limit(limitNum)
        .select("-__v") /* exclude mongoose version field */
        .lean() /* lean() returns plain JS objects — faster */,
    ]);

    /*
      Format response to match Gutendex API format
      so your React frontend needs no changes.
    */
    const formatted = books.map((book) => ({
      id: book.gutenbergId,
      title: book.title,
      authors: book.authors,
      subjects: book.subjects,
      bookshelves: book.bookshelves,
      formats: {
        "text/plain": book.textUrl,
        "text/html": book.htmlUrl,
        "application/epub+zip": book.epubUrl,
        "application/pdf": book.pdfUrl,
        "image/jpeg": book.coverUrl,
      },
      download_count: book.downloadCount,
      languages: book.languages,
    }));

    res.json({
      count: total,
      next:
        pageNum * limitNum < total
          ? `/api/books?page=${pageNum + 1}${search ? `&search=${search}` : ""}${topic ? `&topic=${topic}` : ""}`
          : null,
      previous:
        pageNum > 1
          ? `/api/books?page=${pageNum - 1}${search ? `&search=${search}` : ""}${topic ? `&topic=${topic}` : ""}`
          : null,
      results: formatted,
    });
  } catch (error) {
    /*
      If MongoDB query fails fall back to Gutenberg.
      This is a safety net.
    */
    console.error(
      "MongoDB query failed, falling back to Gutenberg:",
      error.message,
    );

    try {
      const params = new URLSearchParams();
      if (req.query.search) params.set("search", req.query.search);
      if (req.query.topic) params.set("topic", req.query.topic);
      if (req.query.page) params.set("page", req.query.page);

      const qs = params.toString();
      const url = `https://gutendex.com/books${qs ? `?${qs}` : ""}`;
      const response = await fetch(url);
      const data = await response.json();

      res.json(data);
    } catch (fallbackError) {
      next(fallbackError);
    }
  }
});

/* ─────────────────────────────────
   GET /api/books/:id
   Get single book metadata.
   ───────────────────────────────── */

router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    /* Try MongoDB first */
    const book = await Book.findOne({
      gutenbergId: parseInt(id),
    }).lean();

    if (book) {
      return res.json({
        id: book.gutenbergId,
        title: book.title,
        authors: book.authors,
        subjects: book.subjects,
        formats: {
          "text/plain": book.textUrl,
          "text/html": book.htmlUrl,
          "application/epub+zip": book.epubUrl,
          "application/pdf": book.pdfUrl,
          "image/jpeg": book.coverUrl,
        },
        download_count: book.downloadCount,
        languages: book.languages,
      });
    }

    /* Not in database — fetch from Gutenberg */
    const response = await fetch(`https://gutendex.com/books/${id}`);
    if (!response.ok) {
      return res.status(404).json({ error: "Book not found" });
    }

    const data = await response.json();

    /* Save to database for next time */
    await Book.findOneAndUpdate(
      { gutenbergId: data.id },
      { $set: formatBook(data) },
      { upsert: true },
    );

    res.json(data);
  } catch (error) {
    next(error);
  }
});

/* ─────────────────────────────────
   GET /api/books/:id/text
   Get full book text.
   Cached in MongoDB after first fetch.
   ───────────────────────────────── */

router.get("/:id/text", async (req, res, next) => {
  try {
    const { id } = req.params;

    /* Check if text is already cached in MongoDB */
    const cached = await BookText.findOne({
      gutenbergId: parseInt(id),
    });

    if (cached) {
      console.log(`📚 Serving book ${id} text from cache`);
      return res.json({
        bookId: id,
        title: cached.title,
        text: cached.text,
        length: cached.length,
        cached: true,
      });
    }

    /* Not cached — fetch from Gutenberg */
    console.log(`🌐 Fetching book ${id} text from Gutenberg`);

    /* Get book metadata first to find text URL */
    const metaResponse = await fetch(`https://gutendex.com/books/${id}`);
    if (!metaResponse.ok) {
      return res.status(404).json({ error: "Book not found" });
    }

    const book = await metaResponse.json();
    const formats = book.formats;

    /* Find the text URL */
    const textFormatKeys = [
      "text/plain; charset=utf-8",
      "text/plain; charset=us-ascii",
      "text/plain",
    ];

    let textUrl = null;
    for (const key of textFormatKeys) {
      if (formats[key]) {
        textUrl = formats[key];
        break;
      }
    }

    if (!textUrl) {
      textUrl = `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`;
    }

    /* Fetch the text */
    let rawText = null;

    const textResponse = await fetch(textUrl);
    if (textResponse.ok) {
      rawText = await textResponse.text();
    } else {
      /* Try alternative URL */
      const altResponse = await fetch(
        `https://www.gutenberg.org/files/${id}/${id}-0.txt`,
      );
      if (altResponse.ok) {
        rawText = await altResponse.text();
      }
    }

    if (!rawText || rawText.length < 500) {
      return res.status(404).json({
        error: "Book text not available for this title",
      });
    }

    const cleaned = cleanBookText(rawText);

    /*
      Save to MongoDB so next request is instant.
      We don't await this — let it save in the
      background while we send the response.
    */
    BookText.create({
      gutenbergId: parseInt(id),
      title: book.title,
      text: cleaned,
      length: cleaned.length,
    }).catch((err) => {
      /* Duplicate key is fine — another request beat us */
      if (err.code !== 11000) {
        console.error("Failed to cache book text:", err.message);
      }
    });

    res.json({
      bookId: id,
      title: book.title,
      text: cleaned,
      length: cleaned.length,
      cached: false,
    });
  } catch (error) {
    next(error);
  }
});

/* ─────────────────────────────────
   HELPER
   ───────────────────────────────── */

function formatBook(gutenbergBook) {
  return {
    gutenbergId: gutenbergBook.id,
    title: gutenbergBook.title,
    authors: gutenbergBook.authors || [],
    subjects: gutenbergBook.subjects || [],
    bookshelves: gutenbergBook.bookshelves || [],

    textUrl:
      gutenbergBook.formats?.["text/plain; charset=utf-8"] ||
      gutenbergBook.formats?.["text/plain"] ||
      "",

    htmlUrl:
      gutenbergBook.formats?.["text/html; charset=utf-8"] ||
      gutenbergBook.formats?.["text/html"] ||
      "",

    epubUrl: gutenbergBook.formats?.["application/epub+zip"] || "",

    pdfUrl: gutenbergBook.formats?.["application/pdf"] || "",

    coverUrl: gutenbergBook.formats?.["image/jpeg"] || "",

    downloadCount: gutenbergBook.download_count || 0,
    languages: gutenbergBook.languages || [],
    lastSyncedAt: new Date(),
  };
}

function cleanBookText(rawText) {
  let text = rawText;

  const startPatterns = [
    /\*{3}\s*START OF (THE PROJECT GUTENBERG|THIS PROJECT GUTENBERG).*?\*{3}/i,
    /\*\*\* START OF THE PROJECT GUTENBERG EBOOK.*?\*\*\*/i,
  ];

  for (const pattern of startPatterns) {
    const match = text.match(pattern);
    if (match) {
      text = text.slice(match.index + match[0].length);
      break;
    }
  }

  const endPatterns = [
    /\*{3}\s*END OF (THE PROJECT GUTENBERG|THIS PROJECT GUTENBERG).*?\*{3}/i,
    /End of (the )?Project Gutenberg/i,
  ];

  for (const pattern of endPatterns) {
    const match = text.match(pattern);
    if (match) {
      text = text.slice(0, match.index);
      break;
    }
  }

  return text
    .replace(/\r\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

module.exports = router;
