const chalk = require('chalk')
const tinygradient = require('tinygradient')

const matchGradient = tinygradient(['#e67c73', '#ffd666', '#57bb8a'])

module.exports = {
  error: chalk.bold.red,
  info: chalk.yellow,
  success: chalk.bold.green,
  matchValue: chalk.cyan,
  bold: chalk.bold,
  link: chalk.underline.dim,
  separator: chalk.bold.dim,
  keys: chalk.bold.magentaBright,
  matchPercent: pct => chalk.bold.hex(matchGradient.hsvAt(pct).toHexString()),
}
