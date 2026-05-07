/* ================================
   middleware/auth.js
   JWT verification middleware.
   Add this to any route that requires
   the user to be logged in.
   ================================ */

const jwt  = require('jsonwebtoken')
const User = require('../models/User')

async function protect(req, res, next) {
  try {
    let token

    /*
      The token comes in the Authorization header
      in the format: "Bearer eyJhbGci..."
      We check for this format and extract the token.
    */
    const authHeader = req.headers.authorization

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1]
    }

    if (!token) {
      return res.status(401).json({
        error: 'Access denied. Please log in to continue.'
      })
    }

    /*
      jwt.verify() checks the token's signature
      using our JWT_SECRET. If the token was tampered
      with or has expired it throws an error.
      If valid it returns the decoded payload — { userId }.
    */
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    /*
      Find the user in the database using the ID from the token.
      We use .select('-password') to exclude the password field.
      Attach the user to req so route handlers can access it.
    */
    const user = await User.findById(decoded.userId).select('-password')

    if (!user) {
      return res.status(401).json({
        error: 'User no longer exists. Please log in again.'
      })
    }

    if (!user.isActive) {
      return res.status(401).json({
        error: 'Account has been deactivated.'
      })
    }

    /*
      Attach user to the request object.
      Any route handler that runs after this
      middleware can access req.user.
    */
    req.user = user
    next()

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token. Please log in.' })
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please log in again.' })
    }
    next(error)
  }
}

/*
  Helper function to generate a JWT token.
  Used in auth routes after successful
  registration or login.
*/
function generateToken(userId) {
  return jwt.sign(
    { userId },           /* payload — what to encode in the token */
    process.env.JWT_SECRET, /* secret — used to sign the token */
    { expiresIn: '7d' }   /* token expires after 7 days */
  )
}

module.exports = { protect, generateToken }