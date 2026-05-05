/* ================================
   routes/auth.js
   Register and login endpoints.
   We will connect to MongoDB in
   the next lesson. For now these
   return mock responses so you
   can test the server structure.
   ================================ */

const express = require('express')
const router  = express.Router()


/* ─────────────────────────────────
   POST /api/auth/register
   Create a new user account.
   Body: { username, email, password }
   ───────────────────────────────── */

router.post('/register', async (req, res, next) => {
  try {
    /*
      req.body contains the JSON data sent
      by your React app. This only works because
      we added express.json() middleware in server.js.
    */
    const { username, email, password } = req.body

    /* Basic validation */
    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'All fields are required — username, email, password'
      })
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters'
      })
    }

    /*
      TODO: In Lesson 16 we will:
      1. Check if email already exists in MongoDB
      2. Hash the password with bcrypt
      3. Save the user to MongoDB
      4. Generate a JWT token
      5. Return the token
    */

    /* For now return a placeholder response */
    res.status(201).json({
      message:  'Registration endpoint ready — MongoDB coming in Lesson 16',
      username,
      email,
    })

  } catch (error) {
    next(error)
  }
})


/* ─────────────────────────────────
   POST /api/auth/login
   Log in with email and password.
   Body: { email, password }
   ───────────────────────────────── */

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required'
      })
    }

    /*
      TODO: In Lesson 16 we will:
      1. Find user by email in MongoDB
      2. Compare password with bcrypt
      3. Generate a JWT token
      4. Return token and user data
    */

    res.json({
      message: 'Login endpoint ready — MongoDB coming in Lesson 16',
      email,
    })

  } catch (error) {
    next(error)
  }
})


/* ─────────────────────────────────
   GET /api/auth/me
   Get the currently logged in user.
   Requires authentication token.
   ───────────────────────────────── */

router.get('/me', async (req, res, next) => {
  try {
    /*
      TODO: In Lesson 16 we will verify the
      JWT token from the Authorization header
      and return the user's data.
    */

    res.json({
      message: 'Auth check endpoint ready — JWT coming in Lesson 16'
    })

  } catch (error) {
    next(error)
  }
})

module.exports = router