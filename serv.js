import fs from 'fs'

// global variables (with default values)

const opt = {
  alphanumeric: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split(''),
  id_length: 7,
  path: {
    v2: { res: './theme/v2/res', src: './theme/v2/src' }
  }
}

// database

const db = JSON.parse(fs.readFileSync(`${opt.path.v2.res}/db.json`, 'utf-8'))

// utility

Array.prototype.shuffle = function() {
  for (let i = this.length - 1; i > 0; i--) {
    let random_index = Math.floor(Math.random() * (i + 1))
    let swaped_value = this[random_index]

    this[random_index] = this[i]
    this[i] = swaped_value
  }

  return this
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
    const annotator = { uid: '', word_list: [] }

    // build annotator id

    while (1) {
      annotator.uid = hash(opt.id_length)

      if (!fs.existsSync(`${opt.path.v2.src}/mark-result/${annotator.uid}`)) {
        fs.appendFileSync(`${opt.path.v2.src}/mark-result/${annotator.uid}`, JSON.stringify({ action: 'init', time: new Date() .toString() }))

        break
      }
    }

    client.emit('init', [annotator.uid, db.sentence])
  })
}
