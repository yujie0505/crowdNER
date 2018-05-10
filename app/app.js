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
  window.scroll({ top: 0 })

  document.querySelector('#entity input#others').click()

  let stcs = []

  for (let loc of locs) {
    let stc = ''

    for (let wid in app.sources[word.pmid].sentences[loc.stcid].word) {
      if (wid == loc.wid)
        stc += `<em>${app.sources[word.pmid].sentences[loc.stcid].word[wid]}</em>`
      else
        stc += app.sources[word.pmid].sentences[loc.stcid].word[wid]

      stc += app.sources[word.pmid].sentences[loc.stcid].nonWord[wid]
    }

    stcs.push({ pmid: word.pmid, stc: stc, stcid: loc.stcid, value: stcs.length + 1 })
  }

  document.querySelector('#details').innerHTML = Mustache.render(app.detail_tmpl, { stcs: stcs, word: word.w })

  document.querySelector('#details button').onclick = () => {
    let entity = document.querySelector('#entity input:checked'),
        detail = document.querySelector('#details input:checked')

    if (!entity || !detail) return

    socket.emit('submit', {
      entity : entity.dataset.entity,
      pmid   : detail.dataset.pmid,
      stcid  : detail.dataset.stcid,
      value  : detail.dataset.value,
      word   : word.w
    })

    socket.emit('next', render)
  }
}

///////////////////////////////////////////////////////////////////////////////////////

socket.on('init', ([uid, sources]) => {
  app.sources = sources

  document.getElementById('uid').textContent = uid

  socket.emit('next', render)
})
