/* ================================
   routes/auth.js — Complete Version
   Real MongoDB + JWT authentication
   ================================ */

const express              = require('express')
const router               = express.Router()
const User                 = require('../models/User')
const { protect, generateToken } = require('../middleware/auth')


/* ─────────────────────────────────
   POST /api/auth/register
   ───────────────────────────────── */

router.post('/register', async (req, res, next) => {
  try {
    const { username, email, password } = req.body

    /* Validation */
    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'Username, email and password are all required'
      })
    }

    /*
      Check if email or username already exists.
      We check both in one query using $or operator.
      This is more efficient than two separate queries.
    */
    const existingUser = await User.findOne({
      $or: [
        { email:    email.toLowerCase() },
        { username: username },
      ]
    })

    if (existingUser) {
      const field = existingUser.email === email.toLowerCase()
        ? 'email'
        : 'username'

      return res.status(409).json({
        error: `This ${field} is already registered. Please use a different one.`
      })
    }

    /*
      Create the new user.
      The password gets hashed automatically by the
      pre-save middleware we defined in the User model.
    */
    const user = await User.create({
      username,
      email: email.toLowerCase(),
      password,
    })

    /*
      Generate JWT token for immediate login
      after registration — no need to log in separately.
    */
    const token = generateToken(user._id)

    res.status(201).json({
      message: 'Account created successfully! Welcome to The Grand Library.',
      token,
      user:    user.toSafeObject(),
    })

  } catch (error) {
    /*
      Mongoose validation errors have a specific structure.
      We extract the first error message and return it clearly.
    */
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message)
      return res.status(400).json({ error: messages[0] })
    }
    next(error)
  }
})


/* ─────────────────────────────────
   POST /api/auth/login
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
      Find user by email.
      We use .select('+password') to explicitly include
      the password field since we set select:false on it.
      Without this, the password would not be returned
      and we could not verify it.
    */
    const user = await User.findOne({
      email: email.toLowerCase()
    }).select('+password')

    if (!user) {
      /*
        Do NOT say "email not found" — that tells attackers
        which emails are registered.
        Always say the generic "invalid credentials" message.
      */
      return res.status(401).json({
        error: 'Invalid email or password'
      })
    }

    /* Verify password using our instance method */
    const passwordMatch = await user.comparePassword(password)

    if (!passwordMatch) {
      return res.status(401).json({
        error: 'Invalid email or password'
      })
    }

    /* Generate token */
    const token = generateToken(user._id)

    res.json({
      message: `Welcome back, ${user.username}!`,
      token,
      user:    user.toSafeObject(),
    })

  } catch (error) {
    next(error)
  }
})


/* ─────────────────────────────────
   GET /api/auth/me
   Get currently logged in user.
   Requires: Authorization: Bearer <token>
   ───────────────────────────────── */

router.get('/me', protect, async (req, res) => {
  /*
    protect middleware already found and attached
    the user to req.user. Just return it.
  */
  res.json({
    user: req.user.toSafeObject()
  })
})


/* ─────────────────────────────────
   PATCH /api/auth/update-password
   Change password for logged in user.
   ───────────────────────────────── */

router.patch('/update-password', protect, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Current password and new password are required'
      })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'New password must be at least 6 characters'
      })
    }

    /* Get user with password included */
    const user = await User.findById(req.user._id).select('+password')

    /* Verify current password */
    const isMatch = await user.comparePassword(currentPassword)
    if (!isMatch) {
      return res.status(401).json({
        error: 'Current password is incorrect'
      })
    }

    /* Update password — pre-save hook will hash it */
    user.password = newPassword
    await user.save()

    res.json({ message: 'Password updated successfully' })

  } catch (error) {
    next(error)
  }
})

module.exports = router