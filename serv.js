import fs from 'fs'
import math from './lib/math.js'

// global variables (with default values)

const opt = {
  alphanumeric: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.split(''),
  id_length: 7,
  path: {
    v2: { res: './theme/v2/res', src: './theme/v2/src' }
  },
  weighted: { '0': 1, '1': 3, '2': 6 }
}

// database

const db = JSON.parse(fs.readFileSync(`${opt.path.v2.res}/db.json`, 'utf-8'))

// utility

Array.prototype.shuffle = function () {
  for (let i = this.length - 1; i > 0; i--) {
    let random_index = Math.floor(Math.random() * (i + 1))
    let swaped_value = this[random_index]

    this[random_index] = this[i]
    this[i] = swaped_value
  }

  return this
}

const buildList = lists => {
  let levels = Object.keys(lists), list = []
  let pickLevel = math.chooseWeighted(levels, levels.map(it => opt.weighted[it]))

  while (1 < levels.length) {
    let level = pickLevel()

    list.push(lists[level].pop())

    if (!lists[level].length) {
      delete lists[level]

      levels = Object.keys(lists)
      pickLevel = math.chooseWeighted(levels, levels.map(it => opt.weighted[it]))
    }
  }

  return list.concat(lists[levels[0]])
}

const hash = size => {
  let str = ''

  while (size--)
    str += opt.alphanumeric[Math.floor(Math.random() * opt.alphanumeric.length)]

  return str
}

///////////////////////////////////////////////////////////////////////////////////////

module.exports = io => {
  io.on('connect', client => {
    const annotator = {}

    // build annotator's id

    while (1) {
      annotator.uid = hash(opt.id_length)

      if (!fs.existsSync(`${opt.path.v2.src}/mark-result/${annotator.uid}`)) {
        fs.appendFileSync(`${opt.path.v2.src}/mark-result/${annotator.uid}`, JSON.stringify({ action: 'init', time: new Date() .toString() }))

        break
      }
    }

    // build word list

    annotator.word_list = buildList({
      '0': db.annotationList[0].slice().shuffle().sort((a, b) => db.entityCandidate[a].location.length - db.entityCandidate[b].location.length),
      '1': db.annotationList[1].slice().shuffle().sort((a, b) => db.entityCandidate[a].location.length - db.entityCandidate[b].location.length),
      '2': db.annotationList[2].slice().shuffle().sort((a, b) => db.entityCandidate[a].location.length - db.entityCandidate[b].location.length)
    })

    client.emit('init', [annotator.uid, db.sentence])

    client.on('next', cb => {
      let word = annotator.word_list.shift(), lists = {}

      for (let level in db.entityCandidate[word].sortedLoc) {
        if (db.entityCandidate[word].sortedLoc[level].length)
          lists[level] = db.entityCandidate[word].sortedLoc[level].slice().shuffle()
      }

      cb(word, buildList(lists))
    })

    client.on('submit', rlt => {
      rlt.action = 'submit'
      rlt.time = new Date() .toString()

      fs.appendFileSync(`${opt.path.v2.src}/mark-result/${annotator.uid}`, `\n${JSON.stringify(rlt)}`)
    })
  })
}
