const chalk = require('chalk')
const progress = require('progress')

const app = {}

const timeLeft = () => {
  let elapsed = new Date - app.timeBegin
  let eta = (app.currTick === app.totalTicks) ? 0 : elapsed * (app.totalTicks / app.currTick - 1) / 1000
  return `${ Math.floor(eta / 3600) }h ${ Math.floor(eta % 3600 / 60) }m ${ Math.floor(eta % 60) }s`
}

module.exports = {
  create: (state, totalTicks) => {
    app.bar = new progress(`  ${ chalk.gray(state) } [:bar] ${ chalk.cyan(':percent') } :timeLeft`, { incomplete: ' ', total: (app.totalTicks = totalTicks), width: 100 })
    app.currTick = 0
    app.timeBegin = new Date
  },
  tick: () => {
    app.bar.tick({ timeLeft: timeLeft() })
    app.currTick++
  }
}
