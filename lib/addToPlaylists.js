const spotifyToken = require('./spotifyToken')

module.exports = spotify => async (tracks, playlists) => {
  if (!tracks.length || !playlists.length) {
    return
  }

  const token = await spotifyToken()

  spotify.setAccessToken(token)

  return Promise.all(playlists.map(p => spotify.addTracksToPlaylist(p, tracks)))
}
