const fs = require('fs')
const inquirer = require('inquirer')
const SpotifyWebApi = require('spotify-web-api-node')
const stringify = require('csv-stringify')

const addToPlaylists = require('./addToPlaylists')
const fetchPlaylists = require('./fetchPlaylists')
const log = require('./log')
const matchTrack = require('./matchTrack')
const parse = require('./parse')
const forEach = require('./forEach')

module.exports = async (files, { delimiter, encoding, escape, out, quote }) => {
  const spotifyApi = new SpotifyWebApi({
    clientId: 'f6a2ae3880b1430aa1da26a3baf2385b',
  })

  const outFile = out
    ? fs.createWriteStream(out, { encoding, flags: 'a' })
    : null
  const stringifier = out
    ? stringify({
        columns: {
          id: 'id',
          track: 'track',
          artist: 'artist',
          album: 'album',
          playlists: 'playlists',
          matchedTrack: 'matched track',
          matchedArtist: 'matched artist',
          matchedAlbum: 'matched album',
        },
        delimiter,
        escape,
        quote,
      })
    : null

  stringifier && stringifier.pipe(outFile)

  try {
    // Fetch playlists
    log.info('Fetching playlists …')

    const playlists = await fetchPlaylists(spotifyApi)

    // Handle files
    await forEach(files, async file => {
      // Read file
      log.info(`Reading "${file}" …`)

      const records = parse(file, {
        delimiter,
        encoding,
        escape,
        quote,
      }).filter(record => {
        if (!record.track) {
          log(record)
          log.info('Skipping (missing track).')

          stringifier &&
            stringifier.write({
              id: 'Skipping (missing track)',
              track: record.track,
              artist: record.artist,
              album: record.album,
              playlists: record.playlists.join('|'),
              matchedTrack: '',
              matchedArtist: '',
              matchedAlbum: '',
            })

          return false
        }

        if (!record.playlists || !record.playlists.length) {
          log(record)
          log.info('Skipping (no playlists specified).')

          stringifier &&
            stringifier.write({
              id: 'Skipping (no playlists specified)',
              track: record.track,
              artist: record.artist,
              album: record.album,
              playlists: record.playlists.join('|'),
              matchedTrack: '',
              matchedArtist: '',
              matchedAlbum: '',
            })

          return false
        }

        if (record.playlists.some(p => !playlists.has(p))) {
          log(record)
          throw new Error('Aborting (not all playlists available).')
        }

        return true
      })

      // Match tracks
      await forEach(records, async record => {
        const choices = await matchTrack(spotifyApi)(record)

        log(record)

        if (!choices.length) {
          log.info('Skipping (no match found).')

          stringifier &&
            stringifier.write({
              id: 'Skipping (no match found)',
              track: record.track,
              artist: record.artist,
              album: record.album,
              playlists: record.playlists.join('|'),
              matchedTrack: '',
              matchedArtist: '',
              matchedAlbum: '',
            })

          return
        }

        const tracks = []

        if (choices.length === 1 && choices[0].score >= 0.95) {
          // If there's only one match and it's a strong match, go with it.
          tracks.push(choices[0].value)
          log.info('Matched automatically.')
        } else if (
          // If there are 5 matches or less, the closest is pretty close, and the next closest is much less likely, go with that
          choices.length <= 5 &&
          choices.length > 1 &&
          choices[0].score >= 0.97 &&
          choices[1].score < 0.87
        ) {
          tracks.push(choices[0].value)
          log.info('Matched automatically.')
        } else {
          // Otherwise, if the closest is a > 90% match, make it selected automatically
          if (choices[0].score > 0.9) {
            choices[0].checked = true
          }

          // And then show the interactive selection interface
          const selectedTracks = await inquirer.prompt([
            {
              type: 'checkbox',
              name: 'tracks',
              message: 'Select tracks to add (if any):',
              choices,
              pageSize: 20,
            },
          ])

          tracks.push(...selectedTracks.tracks)
        }

        // Add tracks to playlists
        await addToPlaylists(spotifyApi)(
          tracks,
          record.playlists.map(p => playlists.get(p)),
        )

        // Get the track metadata in a format that is easily queriable for stringifier
        const trackMetadata = choices
          .filter(track => tracks.includes(track.value))
          .reduce((previous, current) => {
            previous[current.value] = current.spotifyMetadata

            return previous
          }, {})

        // Write to CSV
        stringifier &&
          (tracks.length ? tracks : ['No Match Found']).forEach(track => {
            stringifier.write({
              id: track,
              track: record.track,
              artist: record.artist,
              album: record.album,
              playlists: record.playlists.join('|'),
              matchedTrack: trackMetadata[track].name,
              matchedArtist: trackMetadata[track].artist,
              matchedAlbum: trackMetadata[track].album,
            })
          })
      })
    })
  } finally {
    stringifier && stringifier.end()
    outFile && outFile.close()
  }

  log.success('Done.')
}
