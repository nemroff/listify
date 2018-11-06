const acquireToken = require('./acquireToken')
const configuration = require('./configuration')
const log = require('./log')

module.exports = async () => {
  const expiryConfiguration = configuration.get('expiry')

  let token = configuration.get('token')
  let expiry = expiryConfiguration ? new Date(expiryConfiguration) : null

  if (expiry && expiry <= new Date(new Date().getTime() + 30 * 1000)) {
    log.info('Spotify token is expired.')
    token = expiry = null
    configuration.delete('token')
    configuration.delete('expiry')
  }

  if (!token) {
    ;[token, expiry] = await acquireToken()

    configuration.set('token', token)
    configuration.set('expiry', expiry)
  }

  return token
}
