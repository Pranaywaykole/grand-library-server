/* ================================
   routes/users.js
   User profile, character,
   favourites, and reading history.
   ================================ */

const express = require('express')
const router  = express.Router()


/* ─────────────────────────────────
   GET /api/users/:id/character
   Get a user's chosen character.
   ───────────────────────────────── */

router.get('/:id/character', async (req, res, next) => {
  try {
    const { id } = req.params

    /*
      TODO: Fetch from MongoDB in Lesson 16
    */

    res.json({
      userId:    id,
      character: {
        name:  "The Scholar",
        emoji: "🧙",
      },
      message: 'Character endpoint ready — MongoDB coming in Lesson 16'
    })

  } catch (error) {
    next(error)
  }
})


/* ─────────────────────────────────
   PUT /api/users/:id/character
   Update a user's chosen character.
   Body: { name, emoji }
   ───────────────────────────────── */

router.put('/:id/character', async (req, res, next) => {
  try {
    const { id }          = req.params
    const { name, emoji } = req.body

    if (!name || !emoji) {
      return res.status(400).json({
        error: 'Character name and emoji are required'
      })
    }

    res.json({
      message:   'Character updated successfully',
      userId:    id,
      character: { name, emoji },
    })

  } catch (error) {
    next(error)
  }
})


/* ─────────────────────────────────
   GET /api/users/:id/favourites
   Get a user's favourite books.
   ───────────────────────────────── */

router.get('/:id/favourites', async (req, res, next) => {
  try {
    const { id } = req.params

    res.json({
      userId:     id,
      favourites: [],
      message:    'Favourites endpoint ready — MongoDB coming in Lesson 16'
    })

  } catch (error) {
    next(error)
  }
})


/* ─────────────────────────────────
   POST /api/users/:id/favourites
   Add a book to favourites.
   Body: { bookId, title, cover }
   ───────────────────────────────── */

router.post('/:id/favourites', async (req, res, next) => {
  try {
    const { id }                  = req.params
    const { bookId, title, cover } = req.body

    if (!bookId || !title) {
      return res.status(400).json({
        error: 'bookId and title are required'
      })
    }

    res.status(201).json({
      message: 'Book added to favourites',
      userId:  id,
      book:    { bookId, title, cover },
    })

  } catch (error) {
    next(error)
  }
})


/* ─────────────────────────────────
   DELETE /api/users/:id/favourites/:bookId
   Remove a book from favourites.
   ───────────────────────────────── */

router.delete('/:id/favourites/:bookId', async (req, res, next) => {
  try {
    const { id, bookId } = req.params

    res.json({
      message: 'Book removed from favourites',
      userId:  id,
      bookId,
    })

  } catch (error) {
    next(error)
  }
})


/* ─────────────────────────────────
   GET /api/users/:id/history
   Get reading history.
   ───────────────────────────────── */

router.get('/:id/history', async (req, res, next) => {
  try {
    const { id } = req.params

    res.json({
      userId:  id,
      history: [],
      message: 'History endpoint ready — MongoDB coming in Lesson 16'
    })

  } catch (error) {
    next(error)
  }
})

module.exports = router