'use strict'

// web framework

import 'imports-loader?define=>false,exports=>false,this=>window!mustache/mustache'

const socket = io()

// custom modules

import './app.sass'
import './index.pug'

// for hot module replacement in development

if ('development' === process.env.NODE_ENV)
  require('webpack-hot-middleware/client').subscribe(event => {
    if ('hmr' === event.action) window.location.reload()
  })

///////////////////////////////////////////////////////////////////////////////////////

// global variables (with default values)

const app = {
  detail_tmpl: document.querySelector('#details script').innerHTML
}
Mustache.parse(app.detail_tmpl)

// utility

const render = (word, locs) => {
  document.querySelector('#entity input#others').click()

  let stcs = []

  for (let loc of locs) {
    let stc = ''

    for (let wid in app.sentence[loc.pmid][loc.stcid].word) {
      if (word === app.sentence[loc.pmid][loc.stcid].word[wid])
        stc += `<em>${app.sentence[loc.pmid][loc.stcid].word[wid]}</em>`
      else
        stc += app.sentence[loc.pmid][loc.stcid].word[wid]

      stc += app.sentence[loc.pmid][loc.stcid].nonWord[wid]
    }

    stcs.push({ pmid: loc.pmid, stc: stc, stcid: loc.stcid, value: stcs.length + 1 })
  }

  document.querySelector('#details').innerHTML = Mustache.render(app.detail_tmpl, { stcs: stcs, word: word })

  document.querySelector('#details button').onclick = () => {
    let entity = document.querySelector('#entity input:checked'),
        detail = document.querySelector('#details input:checked')

    if (!entity || !detail) return

    socket.emit('submit', {
      entity : entity.dataset.entity,
      pmid   : detail.dataset.pmid,
      stcid  : detail.dataset.stcid,
      value  : detail.dataset.value,
      word   : word
    })

    socket.emit('next', render)
  }
}

///////////////////////////////////////////////////////////////////////////////////////

socket.on('init', ([uid, sentence]) => {
  app.sentence = sentence

  document.getElementById('uid').textContent = uid

  socket.emit('next', render)
})
