/* ================================
   routes/users.js — Complete Version
   Real MongoDB operations for
   character, favourites, history,
   and reading progress.
   ================================ */

const express          = require('express')
const router           = express.Router()
const User             = require('../models/User')
const ReadingProgress  = require('../models/ReadingProgress')
const { protect }      = require('../middleware/auth')

/*
  All user routes require authentication.
  We apply the protect middleware to the entire router
  so every route in this file is protected.
*/
router.use(protect)


/* ─────────────────────────────────
   GET /api/users/profile
   Get the logged in user's full profile.
   ───────────────────────────────── */

router.get('/profile', async (req, res, next) => {
  try {
    res.json({ user: req.user.toSafeObject() })
  } catch (error) {
    next(error)
  }
})


/* ─────────────────────────────────
   PATCH /api/users/character
   Update the user's chosen character.
   Body: { name, emoji }
   ───────────────────────────────── */

router.patch('/character', async (req, res, next) => {
  try {
    const { name, emoji } = req.body

    if (!name || !emoji) {
      return res.status(400).json({
        error: 'Character name and emoji are required'
      })
    }

    /*
      findByIdAndUpdate finds a document by ID and updates it.
      { new: true } returns the updated document instead of old.
      { runValidators: true } runs schema validation on the update.
    */
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { character: { name, emoji } },
      { new: true, runValidators: true }
    )

    res.json({
      message:   'Character updated successfully',
      character: user.character,
    })

  } catch (error) {
    next(error)
  }
})


/* ─────────────────────────────────
   PATCH /api/users/preferences
   Update reading preferences.
   Body: { theme, fontSize }
   ───────────────────────────────── */

router.patch('/preferences', async (req, res, next) => {
  try {
    const { theme, fontSize } = req.body

    const updates = {}
    if (theme)    updates['preferences.theme']    = theme
    if (fontSize) updates['preferences.fontSize'] = fontSize

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true }
    )

    res.json({
      message:     'Preferences updated',
      preferences: user.preferences,
    })

  } catch (error) {
    next(error)
  }
})


/* ─────────────────────────────────
   GET /api/users/favourites
   Get all favourite books.
   ───────────────────────────────── */

router.get('/favourites', async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select('favourites')

    res.json({ favourites: user.favourites })

  } catch (error) {
    next(error)
  }
})


/* ─────────────────────────────────
   POST /api/users/favourites
   Add a book to favourites.
   Body: { bookId, title, cover }
   ───────────────────────────────── */

router.post('/favourites', async (req, res, next) => {
  try {
    const { bookId, title, cover } = req.body

    if (!bookId || !title) {
      return res.status(400).json({
        error: 'bookId and title are required'
      })
    }

    /*
      Check if already favourited.
      We use the some() method on the favourites array.
    */
    const user = await User.findById(req.user._id)

    const alreadyFavourited = user.favourites.some(
      f => f.bookId === Number(bookId)
    )

    if (alreadyFavourited) {
      return res.status(409).json({
        error: 'Book is already in your favourites'
      })
    }

    /*
      $push adds an item to an array field.
      This is more efficient than pulling the entire
      document, pushing in JavaScript, and saving.
    */
    await User.findByIdAndUpdate(
      req.user._id,
      {
        $push: {
          favourites: {
            $each:     [{ bookId: Number(bookId), title, cover }],
            $position: 0, /* add to the beginning of array */
          }
        }
      }
    )

    res.status(201).json({
      message: `"${title}" added to favourites`,
    })

  } catch (error) {
    next(error)
  }
})


/* ─────────────────────────────────
   DELETE /api/users/favourites/:bookId
   Remove a book from favourites.
   ───────────────────────────────── */

router.delete('/favourites/:bookId', async (req, res, next) => {
  try {
    const { bookId } = req.params

    /*
      $pull removes all items from an array
      that match the given condition.
    */
    await User.findByIdAndUpdate(
      req.user._id,
      {
        $pull: {
          favourites: { bookId: Number(bookId) }
        }
      }
    )

    res.json({ message: 'Book removed from favourites' })

  } catch (error) {
    next(error)
  }
})


/* ─────────────────────────────────
   GET /api/users/history
   Get reading history (most recent first).
   ───────────────────────────────── */

router.get('/history', async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select('readingHistory')

    res.json({ history: user.readingHistory })

  } catch (error) {
    next(error)
  }
})


/* ─────────────────────────────────
   POST /api/users/history
   Add or update a book in history.
   Body: { bookId, title, cover }
   ───────────────────────────────── */

router.post('/history', async (req, res, next) => {
  try {
    const { bookId, title, cover } = req.body

    if (!bookId || !title) {
      return res.status(400).json({
        error: 'bookId and title are required'
      })
    }

    const user = await User.findById(req.user._id)

    /*
      Remove existing entry for this book if it exists.
      Then add it to the front — creates "most recently read" order.
    */
    user.readingHistory = user.readingHistory.filter(
      h => h.bookId !== Number(bookId)
    )

    user.readingHistory.unshift({
      bookId: Number(bookId),
      title,
      cover,
      readAt: new Date(),
    })

    /* Keep only the 20 most recently read books */
    user.readingHistory = user.readingHistory.slice(0, 20)

    await user.save()

    res.json({
      message: 'Reading history updated',
      history: user.readingHistory,
    })

  } catch (error) {
    next(error)
  }
})


/* ─────────────────────────────────
   GET /api/users/progress/:bookId
   Get reading progress for one book.
   ───────────────────────────────── */

router.get('/progress/:bookId', async (req, res, next) => {
  try {
    const { bookId } = req.params

    const progress = await ReadingProgress.findOne({
      user:   req.user._id,
      bookId: Number(bookId),
    })

    res.json({
      currentPage: progress?.currentPage || 0,
      totalPages:  progress?.totalPages  || 0,
    })

  } catch (error) {
    next(error)
  }
})


/* ─────────────────────────────────
   PUT /api/users/progress/:bookId
   Save reading progress for one book.
   Body: { currentPage, totalPages, bookTitle }
   ───────────────────────────────── */

router.put('/progress/:bookId', async (req, res, next) => {
  try {
    const { bookId }                       = req.params
    const { currentPage, totalPages, bookTitle } = req.body

    /*
      findOneAndUpdate with upsert:true means:
      Find a matching document and update it.
      If no matching document exists, CREATE a new one.
      This is called an "upsert" — update or insert.
      Perfect for progress tracking — works whether the
      user has read this book before or not.
    */
    const progress = await ReadingProgress.findOneAndUpdate(
      {
        user:   req.user._id,
        bookId: Number(bookId),
      },
      {
        currentPage,
        totalPages,
        bookTitle,
        lastReadAt: new Date(),
      },
      {
        new:    true,
        upsert: true, /* create if not exists */
      }
    )

    res.json({
      message:    'Progress saved',
      currentPage: progress.currentPage,
      totalPages:  progress.totalPages,
    })

  } catch (error) {
    next(error)
  }
})

module.exports = router