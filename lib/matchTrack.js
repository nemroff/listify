const fuzz = require('fuzzball')
const log = require('./log')
const spotifyToken = require('./spotifyToken')

const formats = require('./formats')

module.exports = spotify => async record => {
  const query = [
    `track:"${record.track
      .replace(/["“”]/g, '\\"')
      .replace(/['‘’]/g, '')
      .replace(/ +\([^)]+\)$| f(eat|t)\.? .+$/gi, '')}"`,
  ]

  const fuzzyMatchWeight = {
    trackRatio: 100,
    trackPartialRatio: 100,
    trackTokenSortRatio: 100,
    albumRatio: 75,
    albumPartialRatio: 75,
    albumTokenSortRatio: 75,
    seconds: 70,
    track_number: 50,
  }

  const fuzzyMatchCriteria = {
    track: [
      `${record.track.replace(/\b\(?f(?:eat|t)\.? [^()\n\r]+\)?\b/gi, '')}`,
    ],
  }

  if (record.artist) {
    query.push(
      `artist:"${record.artist
        .replace(/["“”]/g, '\\"')
        .replace(/['‘’]/g, '')}"`,
    )

    let artistMatch = `${record.artist}`
    let featArtist = /\b\(?f(?:eat|t)\.? ([^()\n\r]+)\)?\b/gi.exec(record.track)

    if (featArtist && featArtist.length == 2) {
      artistMatch += `/${featArtist[1].replace(/ +and +|, +| +& +/gi, '/')}`
    }

    fuzzyMatchCriteria.track.unshift(artistMatch)
  }

  if (record.album) {
    query.push(`album:"${record.album.replace(/"/g, '\\"')}"`)
    fuzzyMatchCriteria.album = `${record.album
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")}`
  }

  fuzzyMatchCriteria.track = fuzzyMatchCriteria.track
    .join(' | ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")

  if (record['track number'] && record['track number'] !== '0') {
    fuzzyMatchCriteria.track_number = parseInt(record['track number'])
  }

  if (record.duration) {
    fuzzyMatchCriteria.seconds = (fmt => {
      const regResult = /^(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?$/gi.exec(fmt)

      return parseInt(regResult[1]) * 60 + parseInt(regResult[2])
    })(record.duration)
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
        const tracksToReturn = body.tracks.items.map(track => {
          let name = `| ${track.name} |`

          let trackMatchTesting = {
            track: [
              `${track.name.replace(
                /\b\(?f(?:eat|t)\.? [^()\n\r]+\)?\b/gi,
                '',
              )}`,
            ],
          }

          if (track.artists && track.artists.length) {
            name = `| ${track.artists
              .map(a => a.name)
              .join('/')} -${name.replace(/^\|/, '')}`
            trackMatchTesting.track.unshift(
              `${track.artists.map(a => a.name).join('/')}`,
            )
          }

          trackMatchTesting.track = trackMatchTesting.track
            .join(' | ')
            .replace(/[“”]/g, '"')
            .replace(/[‘’]/g, "'")

          const matchScores = {
            trackRatio: fuzz.ratio(
              trackMatchTesting.track,
              fuzzyMatchCriteria.track,
            ),
            trackPartialRatio: fuzz.partial_ratio(
              trackMatchTesting.track,
              fuzzyMatchCriteria.track,
            ),
            trackTokenSortRatio: fuzz.token_sort_ratio(
              trackMatchTesting.track,
              fuzzyMatchCriteria.track,
            ),
          }

          if (track.duration_ms) {
            const seconds = Math.round(track.duration_ms / 1000)

            name += ` ${Math.floor(seconds / 60)}:${(seconds % 60)
              .toString()
              .padStart(2, '0')}`

            if ('seconds' in fuzzyMatchCriteria) {
              matchScores.seconds = ((a, b, variance) => {
                const diff = Math.abs(a - b)
                const score =
                  (variance - (diff > variance ? variance : diff)) / variance

                return Math.round(score * 100)
              })(fuzzyMatchCriteria.seconds, seconds, 10)
            }
          }

          if (track.album) {
            name += ` | ${track.album.name}, Track ${track.track_number}/${track.album.total_tracks}`

            if ('track' in fuzzyMatchCriteria) {
              trackMatchTesting.album = `${track.album.name
                .replace(/[“”]/g, '"')
                .replace(/[‘’]/g, "'")}`

              matchScores.albumRatio = fuzz.ratio(
                trackMatchTesting.track,
                fuzzyMatchCriteria.track,
              )
              matchScores.albumPartialRatio = fuzz.partial_ratio(
                trackMatchTesting.track,
                fuzzyMatchCriteria.track,
              )
              matchScores.albumTokenSortRatio = fuzz.token_sort_ratio(
                trackMatchTesting.track,
                fuzzyMatchCriteria.track,
              )
            }

            if ('track_number' in fuzzyMatchCriteria) {
              matchScores.track_number = ((a, b, variance) => {
                const diff = Math.abs(a - b)
                const score =
                  (variance - (diff > variance ? variance : diff)) / variance

                return Math.round(score * 100)
              })(fuzzyMatchCriteria.track_number, track.track_number, 3)
            }
          }

          matchScores.avg =
            Object.keys(matchScores)
              .map(key => (matchScores[key] / 100) * fuzzyMatchWeight[key])
              .reduce((a, b) => a + b, 0) /
            Object.keys(matchScores)
              .map(key => fuzzyMatchWeight[key])
              .reduce((a, b) => a + b, 0)

          if (track.external_urls && track.external_urls.spotify) {
            name = `${name} | ${formats.link(track.external_urls.spotify)}`
          }

          const matchString = formats.matchPercent(matchScores.avg)(
            `${Math.round(matchScores.avg * 100)
              .toString()
              .padStart(2)}% Match`,
          )

          name = `${matchString} ${name}`

          return {
            name: name.replace(/^\|/, ''),
            value: track.uri,
            matchScores,
            score: matchScores.avg,
            spotifyMetadata: {
              name: track.name,
              artist: `${track.artists.map(a => a.name).join('/')}`,
              album: track.album.name,
            },
          }
        })

        return tracksToReturn.sort(
          (trackA, trackB) => trackB.score - trackA.score,
        )
      }
    } catch (error) {
      log.error('Error while matching track:')
      log.error(error)
    }
  } while (--query.length)

  return []
}
