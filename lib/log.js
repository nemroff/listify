//const table = require('text-table')
const formats = require('./formats')

const log = message => console.log(message)

/*
log.propertyTable = (
  obj,
  order = ['track', 'artist', 'album', 'playlists'],
  includeOthers = true,
) => {
  const columns = []

  columns.push(order.map(ol => [ol, obj[ol] || '']))

  columns.push([])

  if (includeOthers) {
    Object.keys(obj).forEach(
      key => !order.includes(key) && columns[1].push([key, obj[key]]),
    )
  }

  columns.forEach(col =>
    col.forEach((el, i) => {
      if (Array.isArray(el[1])) {
        const values = el[1]

        el[1] = values.shift()
        col.splice(i + 1, 0, ...values.map(val => [' ', val]))
      }
    }),
  )

  columns.forEach(col =>
    col.forEach(el => {
      el[0] = formats.keys(el[0])
      el[1] = el[1]
    }),
  )

  const fmtColumns = columns.map(col =>
    table(col, { hsep: formats.separator(' : ') }).split('\n'),
  )

  const maxFmtLines = fmtColumns.reduce(
    (maxI, el) => (el.length > maxI ? el.length : maxI),
    0,
  )

  const finalTable = []

  for (let i = 0; i < maxFmtLines; i++) {
    finalTable.push(['', ...fmtColumns.map(col => col[i] || ' '), ''])
  }

  log('')
  log(table(finalTable, { hsep: formats.bold('    |    ') }))
  log('')
}
*/

log.error = error =>
  console.error(formats.error(error.message ? error.message : error))

log.errorAndOut = (error, program) => {
  log.error(error)

  if (program) {
    log()
    program.help()
  } else {
    process.exit(1)
  }
}

log.info = message => console.error(formats.info(message))
log.success = message => console.log(formats.success(message))

log.autoMatch = message =>
  console.log(
    `${formats.success('✓')} ${formats.success(
      'Track matched automatically',
    )}  ${formats.bold(':')} ${formats.matchValue(message)}`,
  )

module.exports = log
