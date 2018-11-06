const Koa = require('koa')
const createRouter = require('koa-router')
const opn = require('opn')
const querystring = require('querystring')
const uuid = require('uuid/v4')

const log = require('./log')

const html = {
  callback: `<doctype !html>
<html>
<head><meta charset="utf-8"><title>listify token callback</title></head>
<body>
  <h1>Forwarding token to listify …</h1>
  <script>location = location.href.replace('#', '?')</script>
</body>
</html>`,
  received: `<doctype !html>
<html>
<head><meta charset="utf-8"><title>listify token callback</title></head>
<body>
  <h1>Token accepted.</h1>
  <script>close()</script>
</body>
</html>`,
}
const authorizationUri = 'https://accounts.spotify.com/authorize'
const path = '/callback/'
const port = 37841
const requestData = {
  client_id: 'f6a2ae3880b1430aa1da26a3baf2385b',
  redirect_uri: `http://localhost:${port}${path}`,
  response_type: 'token',
  scope: [
    'playlist-read-private',
    'playlist-modify-public',
    'playlist-modify-private',
    'user-read-private',
  ].join(' '),
}

module.exports = () => {
  const app = new Koa()
  const router = createRouter()
  const state = uuid()

  return new Promise(resolve => {
    router.get(path, async ctx => {
      if (!ctx.query.access_token) {
        log.info('Callback invoked.')
        ctx.body = html.callback

        return
      }

      if (state !== ctx.query.state) {
        const message = 'Invalid token state.'

        log.error(message)
        ctx.throw(400, message)
      }

      log.success('Token received.')
      ctx.body = html.received

      resolve([
        ctx.query.access_token,
        ctx.query.expires_in
          ? new Date(new Date().getTime() + +ctx.query.expires_in * 1000)
          : null,
      ])
      // eslint-disable-next-line no-use-before-define
      server.close()
    })

    const server = app
      .use(router.routes())
      .use(router.allowedMethods())
      .listen(port)

    // Start authorization request
    const uri = `${authorizationUri}?${querystring.stringify({
      ...requestData,
      state,
    })}`

    log.info('Please connect listify to your Spotify account!')
    opn(uri)
    log(`If no browser opened, manually visit ${uri}`)
  })
}
