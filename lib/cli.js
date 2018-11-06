const program = require('commander')

const listify = require('./listify')
const log = require('./log')
const pkg = require('../package.json')

program
  .usage('[options] <file ...>')
  .arguments('<file...>')
  .option('-c, --character-encoding [encoding]', 'character encoding', 'utf8')
  .option('-d, --delimiter [character]', 'field delimiter', ',')
  .option(
    '-e, --escape [character]',
    'CSV escape character (default: quote character)',
  )
  .option('-o, --out [file]', 'CSV to write results to')
  .option('-q, --quote [character]', 'field quote character', '"')
  .option('-v, --verbose', 'give verbose output')
  .version(pkg.version)
  .action((files, cmd) => {
    if (typeof files === 'undefined') {
      log.errorAndOut('No input files were given!')
    }

    if (cmd.delimiter.length !== 1) {
      log.errorAndOut('Delimiter must be a single character!', cmd)
    }

    if (cmd.quote.length !== 1) {
      log.errorAndOut('Quote character must be a single character!', cmd)
    }

    if (typeof cmd.escape === 'undefined') {
      cmd.escape = cmd.quote
    } else if (cmd.escape.length !== 1) {
      log.errorAndOut('Escape character must be a single character!', cmd)
    }

    listify(files, {
      delimiter: cmd.delimiter,
      encoding: cmd.encoding,
      escape: cmd.escape,
      out: cmd.out,
      quote: cmd.quote,
      verbose: cmd.verbose,
    }).catch(error => {
      log.errorAndOut(error)
    })
  })
  .parse(process.argv)
