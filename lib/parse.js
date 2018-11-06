const fs = require('fs')
const parse = require('csv-parse/lib/sync')

// noinspection JSUnusedGlobalSymbols
module.exports = (file, { delimiter, encoding, escape, quote }) =>
  parse(fs.readFileSync(file, { encoding }), {
    columns: header => {
      const columns = header.map(
        column => (column ? column.toLowerCase() : null),
      )

      if (!columns.includes('track')) {
        throw new Error('No "tracks" column found!')
      }

      if (!columns.includes('playlists')) {
        throw new Error('No "|"-separated "playlists" column found!')
      }

      return columns
    },
    delimiter,
    escape,
    quote,
    skip_empty_lines: true,
    trim: true,
  }).map(record => ({
    ...record,
    playlists: record.playlists
      .split('|')
      .map(p => p.trim())
      .filter(p => p),
  }))
