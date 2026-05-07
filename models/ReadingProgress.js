/* ================================
   models/ReadingProgress.js
   Tracks exactly which page a user
   is on for each book they read.
   Stored separately from user for
   performance — progress updates
   constantly as pages turn.
   ================================ */

const mongoose = require('mongoose')

const readingProgressSchema = new mongoose.Schema(
  {
    user: {
      /*
        ObjectId is MongoDB's unique ID type.
        ref: 'User' creates a reference to the User model.
        This is like a foreign key in SQL.
        You can use .populate('user') to replace this ID
        with the actual user document in a query.
      */
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },

    bookId: {
      type:     Number,
      required: true,
    },

    bookTitle: {
      type:     String,
      required: true,
    },

    currentPage: {
      type:    Number,
      default: 0,
      min:     0,
    },

    totalPages: {
      type:    Number,
      default: 0,
    },

    /*
      Virtual field — not stored in DB.
      Calculated from currentPage and totalPages.
    */
    lastReadAt: {
      type:    Date,
      default: Date.now,
    },
  },
  { timestamps: true }
)

/*
  Compound index — ensures each user can only
  have ONE progress record per book.
  If a user tries to create a second progress
  record for the same book, MongoDB rejects it.
  unique: true on the compound pair enforces this.
*/
readingProgressSchema.index({ user: 1, bookId: 1 }, { unique: true })

const ReadingProgress = mongoose.model('ReadingProgress', readingProgressSchema)

module.exports = ReadingProgress