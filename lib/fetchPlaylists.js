const spotifyToken = require('./spotifyToken')

const pageSize = 50

module.exports = async spotify => {
  const token = await spotifyToken()
  const playlists = new Map()

  spotify.setAccessToken(token)

  const {
    body: { id },
  } = await spotify.getMe()

  for (let offset = 0; ; offset += pageSize) {
    const {
      body: { items, next },
    } = await spotify.getUserPlaylists(undefined, {
      limit: pageSize,
      offset,
    })

    items
      .filter(
        p => p.type === 'playlist' && (p.owner.id === id || p.collaborative),
      )
      .forEach(p => playlists.has(p.name) || playlists.set(p.name, p.id))

    if (!next) {
      break
    }
  }

  return playlists
}
