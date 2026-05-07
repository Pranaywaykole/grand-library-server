/* ================================
   models/BookText.js
   Stores the full text of books
   separately from metadata.
   Only fetched when user opens a book.
   ================================ */

const mongoose = require('mongoose')

const bookTextSchema = new mongoose.Schema(
  {
    gutenbergId: {
      type:     Number,
      required: true,
      unique:   true,
      index:    true,
    },

    title: {
      type: String,
      default: '',
    },

    /* The full cleaned text */
    text: {
      type:     String,
      required: true,
    },

    /* Character count */
    length: {
      type:    Number,
      default: 0,
    },

    /* When the text was fetched */
    fetchedAt: {
      type:    Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
)

const BookText = mongoose.model('BookText', bookTextSchema)

module.exports = BookText