const formats = require('./formats')

const log = message => console.log(message)

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

module.exports = log
