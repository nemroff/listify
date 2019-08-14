const chalk = require('chalk')

module.exports = {
  error: chalk.bold.red,
  info: chalk.yellow,
  success: chalk.bold.green,
  matchValue: chalk.cyan,
  bold: chalk.bold,
  link: chalk.underline.dim,
  separator: chalk.bold.dim,
  keys: chalk.bold.magentaBright,
}
