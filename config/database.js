/* ================================
   config/database.js
   MongoDB connection setup.
   ================================ */

const mongoose = require('mongoose')

async function connectDatabase() {
  try {
    /*
      mongoose.connect() returns a Promise.
      We await it so we know the connection
      succeeded before the server starts
      accepting requests.
    */
    const connection = await mongoose.connect(process.env.MONGODB_URI)

    console.log(`✅ MongoDB connected: ${connection.connection.host}`)

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message)

    process.exit(1)
  }
}

/*
  Listen for connection events.
*/
mongoose.connection.on('disconnected', () => {
  console.log('⚠️  MongoDB disconnected')
})

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected')
})

module.exports = connectDatabase