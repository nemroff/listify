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

          return false
        }

        if (!record.playlists || !record.playlists.length) {
          log(record)
          log.info('Skipping (no playlists specified).')

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

          return
        }

        const { tracks } = await inquirer.prompt([
          {
            type: 'checkbox',
            name: 'tracks',
            message: 'Select tracks to add (if any):',
            choices,
            pageSize: 20,
          },
        ])

        // Add tracks to playlists
        await addToPlaylists(spotifyApi)(
          tracks,
          record.playlists.map(p => playlists.get(p)),
        )

        // Write to CSV
        stringifier &&
          tracks.forEach(track => {
            stringifier.write({
              id: track,
              track: record.track,
              artist: record.artist,
              album: record.album,
              playlists: record.playlists.join('|'),
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
