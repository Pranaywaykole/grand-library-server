/* ================================
   server.js — The Grand Library Backend
   Main entry point
   ================================ */

/*
  dotenv loads your .env file into process.env.
  Must be called before anything else that needs
  environment variables.
*/
const connectDatabase = require('./config/database')
require('dotenv').config()

const express = require('express')
const cors    = require('cors')

/*
  Create the Express application.
  This is the object you use to define routes,
  add middleware, and start the server.
*/
const app = express()


/* ─────────────────────────────────
   MIDDLEWARE
   Middleware is code that runs on
   EVERY request before it reaches
   your route handlers.
   ───────────────────────────────── */

/*
  cors() allows your React app at localhost:5173
  to make requests to this server at localhost:5000.
  Without this the browser would block all requests
  with a CORS error — the same problem you had with
  fetching from Gutenberg directly.
*/
app.use(cors({
  origin: true,
  credentials: true,
}))

/*
  express.json() parses incoming request bodies
  that are in JSON format. Without this, req.body
  would be undefined when your React app sends JSON.
*/
app.use(express.json())

/*
  express.urlencoded() parses form data.
  extended:true allows nested objects.
*/
app.use(express.urlencoded({ extended: true }))

/*
  A simple request logger middleware.
  This is a function that runs on every request
  and logs the method and URL to the terminal.
  next() tells Express to continue to the next
  middleware or route handler.
*/
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`)
  next()
})

/* Add this before your other routes */
app.get('/', (req, res) => {
  res.json({
    name:    'The Grand Library API',
    version: '1.0.0',
    status:  'running',
    docs: {
      books:  '/api/books',
      auth:   '/api/auth',
      users:  '/api/users',
      health: '/api/health',
    }
  })
})
connectDatabase()

/* ─────────────────────────────────
   ROUTES
   ───────────────────────────────── */

/*
  Import route files.
  Each file handles a group of related routes.
  We will create these files shortly.
*/
const bookRoutes = require('./routes/books')
const authRoutes = require('./routes/auth')
const userRoutes = require('./routes/users')

/*
  Mount the routes on specific base paths.
  Any request to /api/books goes to bookRoutes.
  Any request to /api/auth goes to authRoutes.
  Any request to /api/users goes to userRoutes.
*/
app.use('/api/books', bookRoutes)
app.use('/api/auth',  authRoutes)
app.use('/api/users', userRoutes)

/*
  Health check route — a simple endpoint to confirm
  the server is running. Useful for monitoring.
*/
app.get('/api/health', (req, res) => {
  res.json({
    status:    'ok',
    message:   'The Grand Library server is running',
    timestamp: new Date().toISOString(),
  })
})


/* ─────────────────────────────────
   404 HANDLER
   This runs when no route matched
   the incoming request.
   ───────────────────────────────── */

app.use((req, res) => {
  res.status(404).json({
    error:   'Not Found',
    message: `Route ${req.method} ${req.url} does not exist`,
  })
})


/* ─────────────────────────────────
   GLOBAL ERROR HANDLER
   This runs when any route or
   middleware calls next(error).
   Must have exactly four parameters.
   ───────────────────────────────── */

app.use((error, req, res, next) => {
  console.error('Server error:', error.message)

  const statusCode = error.statusCode || 500
  const message    = error.message    || 'Internal Server Error'

  res.status(statusCode).json({
    error:   message,
    /* Only show stack trace in development */
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  })
})


/* ─────────────────────────────────
   START THE SERVER
   ───────────────────────────────── */

const startKeepAlive = require('./utils/keepAlive')

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`\n📚 The Grand Library Server`)
  console.log(`   Running at: http://localhost:${PORT}`)
  console.log(`   Environment: ${process.env.NODE_ENV}`)
  console.log(`   Health check: http://localhost:${PORT}/api/health\n`)

  if (process.env.NODE_ENV === 'production') {
    startKeepAlive('https://grand-library-server.onrender.com')
  }
})
