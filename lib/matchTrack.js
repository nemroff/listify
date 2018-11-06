const log = require('./log')
const spotifyToken = require('./spotifyToken')

module.exports = spotify => async record => {
  const query = [`track:"${record.track.replace(/"/g, '\\"')}"`]

  if (record.artist) {
    query.push(`artist:"${record.artist.replace(/"/g, '\\"')}"`)
  }

  if (record.album) {
    query.push(`album:"${record.album.replace(/"/g, '\\"')}"`)
  }

  const token = await spotifyToken()

  spotify.setAccessToken(token)

  do {
    try {
      const { body } = await spotify.searchTracks(query.join(' '), {
        market: 'from_token',
      })

      if (
        body &&
        body.tracks &&
        body.tracks.items &&
        body.tracks.items.length
      ) {
        return body.tracks.items.map(track => {
          let name = `| ${track.name} |`

          if (track.artists && track.artists.length) {
            name = `| ${track.artists
              .map(a => a.name)
              .join('/')} -${name.replace(/^\|/, '')}`
          }

          if (track.duration_ms) {
            const seconds = Math.round(track.duration_ms / 1000)

            name += ` ${Math.floor(seconds / 60)}:${(seconds % 60)
              .toString()
              .padStart(2, '0')}`
          }

          if (track.album) {
            name += ` @ ${track.album.name}, ${track.track_number}/${
              track.album.total_tracks
            }`
          }

          if (track.external_urls && track.external_urls.spotify) {
            name = `${track.external_urls.spotify} ${name}`
          }

          return { name: name.replace(/^\|/, ''), value: track.uri }
        })
      }
    } catch (error) {
      log.error('Error while matching track:')
      log.error(error)
    }
  } while (--query.length)

  return []
}
