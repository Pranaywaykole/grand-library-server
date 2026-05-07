/* ================================
   scripts/seedBooks.js
   Fetches books from Gutenberg API
   and saves them to MongoDB.

   Run with: node scripts/seedBooks.js

   This runs ONCE to populate your
   database. After that your backend
   serves books from MongoDB directly.
   ================================ */

require("dotenv").config();
const mongoose = require("mongoose");
const Book = require("../models/Book");

/* ─────────────────────────────────
   CONFIGURATION
   ───────────────────────────────── */

/*
  How many pages to fetch from Gutenberg.
  Each page has 32 books.
  32 pages × 32 books = 1024 books total.
  Adjust this number based on how many
  books you want in your database.
  Start with 50 pages (1600 books) for a
  good initial library.
*/
const PAGES_TO_FETCH = 50;

/*
  Delay between requests in milliseconds.
  Gutenberg rate limits aggressive scrapers.
  500ms between requests keeps us safe.
*/
const REQUEST_DELAY = 500;

/* ─────────────────────────────────
   HELPERS
   ───────────────────────────────── */

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractCoverUrl(formats) {
  return formats["image/jpeg"] || "";
}
function extractTextUrl(formats) {
  return formats["text/plain; charset=utf-8"] || formats["text/plain"] || "";
}

function extractHtmlUrl(formats) {
  return formats["text/html; charset=utf-8"] || formats["text/html"] || "";
}

function extractEpubUrl(formats) {
  return formats["application/epub+zip"] || "";
}

function extractPdfUrl(formats) {
  return formats["application/pdf"] || "";
}

function formatBook(gutenbergBook) {
  return {
    gutenbergId: gutenbergBook.id,

    title: gutenbergBook.title,

    authors: gutenbergBook.authors || [],

    subjects: gutenbergBook.subjects || [],

    bookshelves: gutenbergBook.bookshelves || [],

    textUrl: extractTextUrl(gutenbergBook.formats || {}),

    htmlUrl: extractHtmlUrl(gutenbergBook.formats || {}),

    epubUrl: extractEpubUrl(gutenbergBook.formats || {}),

    pdfUrl: extractPdfUrl(gutenbergBook.formats || {}),

    coverUrl: extractCoverUrl(gutenbergBook.formats || {}),

    downloadCount: gutenbergBook.download_count || 0,

    languages: gutenbergBook.languages || [],

    lastSyncedAt: new Date(),
  };
}

/* ─────────────────────────────────
   FETCH ONE PAGE FROM GUTENBERG
   ───────────────────────────────── */

async function fetchPage(page) {
  const url = `https://gutendex.com/books?page=${page}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch page ${page}: ${response.status}`);
  }

  return response.json();
}

/* ─────────────────────────────────
   SAVE BOOKS TO MONGODB
   ───────────────────────────────── */

async function saveBooksToDatabase(books) {
  let saved = 0;
  let skipped = 0;

  for (const gutenbergBook of books) {
    try {
      /*
        insertOne with upsert — if a book with this
        gutenbergId already exists update it.
        If not create it fresh.
        This makes the script safe to run multiple times.
      */
      await Book.findOneAndUpdate(
        { gutenbergId: gutenbergBook.id },
        { $set: formatBook(gutenbergBook) },
        {
          upsert: true,
          returnDocument: "after",
        },
      );
      saved++;
    } catch (error) {
      console.error(
        `  ⚠️  Failed to save book ${gutenbergBook.id}:`,
        error.message,
      );
      skipped++;
    }
  }

  return { saved, skipped };
}

/* ─────────────────────────────────
   MAIN SEED FUNCTION
   ───────────────────────────────── */

async function seedBooks() {
  console.log("\n📚 Grand Library — Book Seeder");
  console.log("================================");
  console.log(
    `Will fetch ${PAGES_TO_FETCH} pages (≈${PAGES_TO_FETCH * 32} books)\n`,
  );

  /* Connect to MongoDB */
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }

  let totalSaved = 0;
  let totalSkipped = 0;
  let totalBooks = 0;

  /* Fetch pages one by one */
  for (let page = 1; page <= PAGES_TO_FETCH; page++) {
    try {
      process.stdout.write(`📄 Page ${page}/${PAGES_TO_FETCH} — fetching...`);

      const data = await fetchPage(page);

      /* Save total count on first page */
      if (page === 1) {
        totalBooks = data.count;
        console.log(
          `\n   Total books on Gutenberg: ${totalBooks.toLocaleString()}`,
        );
        console.log(`   We will cache ${PAGES_TO_FETCH * 32} of them\n`);
      }

      const { saved, skipped } = await saveBooksToDatabase(data.results);
      totalSaved += saved;
      totalSkipped += skipped;

      process.stdout.write(` ✅ ${saved} saved, ${skipped} skipped\n`);

      /*
        If there is no next page stop early.
        Happens when PAGES_TO_FETCH exceeds
        total available pages.
      */
      if (!data.next) {
        console.log("\n📚 Reached last page of Gutenberg catalog");
        break;
      }

      /* Wait before next request */
      if (page < PAGES_TO_FETCH) {
        await sleep(REQUEST_DELAY);
      }
    } catch (error) {
      console.error(`\n❌ Error on page ${page}:`, error.message);
      console.log("   Waiting 2 seconds before retrying...");
      await sleep(2000);

      /* Retry this page once */
      try {
        const data = await fetchPage(page);
        const { saved } = await saveBooksToDatabase(data.results);
        totalSaved += saved;
        console.log(`   ✅ Retry succeeded — ${saved} books saved`);
      } catch (retryError) {
        console.error(`   ❌ Retry also failed — skipping page ${page}`);
      }
    }
  }

  /* Final summary */
  console.log("\n================================");
  console.log("✅ Seeding Complete!");
  console.log(`   Books saved:   ${totalSaved}`);
  console.log(`   Books skipped: ${totalSkipped}`);
  console.log(`   Total in DB:   ${totalSaved}`);

  /* Verify count in database */
  const dbCount = await Book.countDocuments();
  console.log(`   MongoDB count: ${dbCount} books`);
  console.log("================================\n");

  await mongoose.disconnect();
  process.exit(0);
}

/* Run the seeder */
seedBooks().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
