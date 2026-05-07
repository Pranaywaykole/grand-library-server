/* ================================
   models/Book.js
   Stores Gutenberg book metadata
   permanently in your database.
   ================================ */

const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema(
  {
    /* Gutenberg's original book ID */
    gutenbergId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      index: true /* index for fast text search */,
    },

    /* Authors array from Gutenberg */
    authors: [
      {
        name: { type: String, default: "" },
        birth_year: { type: Number, default: null },
        death_year: { type: Number, default: null },
      },
    ],

    /* Subjects/genres */
    subjects: [String],

    /* Bookshelves from Gutenberg */
    bookshelves: [String],

    /* Available file formats and their URLs */
    textUrl: {
      type: String,
      default: "",
    },

    htmlUrl: {
      type: String,
      default: "",
    },

    epubUrl: {
      type: String,
      default: "",
    },

    pdfUrl: {
      type: String,
      default: "",
    },

    /* How many times downloaded from Gutenberg */
    downloadCount: {
      type: Number,
      default: 0,
      index: true,
    },

    /* Cover image URL extracted from formats */
    coverUrl: {
      type: String,
      default: "",
    },

    /* Language */
    languages: [String],

    /*
      Text content cached from Gutenberg.
      Stored separately so book listings
      load fast without carrying full text.
      We use a separate BookText model for this.
    */
    hasText: {
      type: Boolean,
      default: false,
    },

    /* When we last synced this from Gutenberg */
    lastSyncedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

/*
  Text index for search.
  MongoDB text index allows fast full-text search
  across title and authors simultaneously.
*/
bookSchema.index({
  title: "text",
  "authors.name": "text",
  subjects: "text",
});

const Book = mongoose.model("Book", bookSchema);

module.exports = Book;
