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
    ? fs.createWriteStream(out, { encoding, flags: 'a+' })
    : null
  const stringifier = out
    ? stringify({
        columns: [
          { key: 'status', header: 'Match Status' },
          { key: 'id', header: 'Spotify ID' },
          { key: 'track', header: 'Source Track' },
          { key: 'artist', header: 'Source Artist' },
          { key: 'album', header: 'Source Album' },
          { key: 'playlists', header: 'Playlists' },
          { key: 'matchedTrack', header: 'Matched Track' },
          { key: 'matchedArtist', header: 'Matched Artist' },
          { key: 'matchedAlbum', header: 'Matched Album' },
        ],
        header: fs.statSync(out).size == 0,
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
              status: 'Skipping (missing track)',
              track: record.track,
              artist: record.artist,
              album: record.album,
              playlists: record.playlists.join('|'),
            })

          return false
        }

        if (!record.playlists || !record.playlists.length) {
          log(record)
          log.info('Skipping (no playlists specified).')

          stringifier &&
            stringifier.write({
              status: 'Skipping (no playlists specified)',
              track: record.track,
              artist: record.artist,
              album: record.album,
              playlists: record.playlists.join('|'),
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

        //log.propertyTable(record)
        log(record)

        if (!choices.length) {
          log.info('Skipping (no match found).')

          stringifier &&
            stringifier.write({
              status: 'Skipping (no match found)',
              track: record.track,
              artist: record.artist,
              album: record.album,
              playlists: record.playlists.join('|'),
            })

          return
        }

        const tracks = []

        if (choices.length === 1 && choices[0].score >= 0.95) {
          // If there's only one match and it's a strong match, go with it.
          tracks.push(choices[0].value)
          log.autoMatch(choices[0].name)
        } else if (
          // If there are 10 matches or less, the closest is really close, and the next closest is much less likely, go with that
          choices.length <= 10 &&
          choices.length > 1 &&
          choices[0].score >= 0.97 &&
          choices[1].score < 0.8
        ) {
          tracks.push(choices[0].value)
          log.autoMatch(choices[0].name)
        } else {
          // Otherwise, if the closest is a > 90% match, make it selected automatically
          if (choices[0].score > 0.9) {
            choices[0].checked = true
          }

          if (choices.length == 20) {
            choices.push(new inquirer.Separator())
          }

          // And then show the interactive selection interface
          const { selectedTracks } = await inquirer.prompt([
            {
              type: 'checkbox',
              name: 'selectedTracks',
              message: 'Select tracks to add (if any):',
              choices,
              pageSize: 21,
            },
          ])

          tracks.push(...selectedTracks)
        }

        // Add tracks to playlists
        await addToPlaylists(spotifyApi)(
          tracks,
          record.playlists.map(p => playlists.get(p)),
        )

        // Write to CSV
        if (stringifier) {
          if (tracks.length) {
            tracks.forEach(track => {
              const m = Object.assign(
                { name: '', artist: '', album: '' },
                choices.filter(el => el.value === track)[0].spotifyMetadata ||
                  {},
              )

              stringifier.write({
                status: 'Matched',
                id: track,
                track: record.track,
                artist: record.artist,
                album: record.album,
                playlists: record.playlists.join('|'),
                matchedTrack: m.name,
                matchedArtist: m.artist,
                matchedAlbum: m.album,
              })
            })
          } else {
            stringifier.write({
              status: 'No Match Found',
              track: record.track,
              artist: record.artist,
              album: record.album,
              playlists: record.playlists.join('|'),
            })
          }
        }
      })
    })
  } finally {
    stringifier && stringifier.end()
    outFile && outFile.close()
  }

  log.success('Done.')
}
