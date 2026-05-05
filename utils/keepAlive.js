/* ================================
   utils/keepAlive.js
   Pings the server every 14 minutes
   to prevent Render from sleeping.
   ================================ */

function startKeepAlive(serverUrl) {
  const INTERVAL = 14 * 60 * 1000 /* 14 minutes */

  setInterval(async () => {
    try {
      await fetch(`${serverUrl}/api/health`)
      console.log('Keep-alive ping sent')
    } catch (error) {
      console.log('Keep-alive ping failed:', error.message)
    }
  }, INTERVAL)
}

module.exports = startKeepAlive