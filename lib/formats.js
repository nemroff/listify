const chalk = require('chalk')
const tinygradient = require('tinygradient')

const matchGradient = tinygradient([
  { color: '#e67c73', pos: 0.6 }, //  red
  { color: '#ffd666', pos: 0.78 }, // yellow
  { color: '#57bb8a', pos: 0.96 }, // green
])

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
