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

        log(choices)

        choices.reduce(
          (reducer, newItem) => {
            return newItem.score > 0.9 && newItem.score > reducer.score
              ? newItem
              : reducer
          },
          { score: 0, value: null },
        ).checked = true

        const tracks = []

        if (choices.length === 1 && choices[0].score >= 0.95) {
          tracks.push(choices[0].value)
        } else if (
          choices.length <= 5 &&
          choices.length > 1 &&
          choices[0].score >= 0.97 &&
          choices[1].score < 0.87
        ) {
          tracks.push(choices[0].value)
        } else {
          tracks.concat(
            await inquirer.prompt([
              {
                type: 'checkbox',
                name: 'tracks',
                message: 'Select tracks to add (if any):',
                choices,
                pageSize: 20,
              },
            ]),
          )
        }

        log(tracks)

        // Add tracks to playlists
        await addToPlaylists(spotifyApi)(
          tracks,
          record.playlists.map(p => playlists.get(p)),
        )

        // Write to CSV
        stringifier &&
          (tracks.length ? tracks : ['No Match Found']).forEach(track => {
            stringifier.write({
              id: track,
              track: record.track,
              artist: record.artist,
              album: record.album,
              playlists: record.playlists.join('|'),
              matchedTrack: '',
              matchedArtist: '',
              matchedAlbum: '',
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
