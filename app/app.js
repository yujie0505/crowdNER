'use strict'

// web framework

import Plotly from 'plotly.js/dist/plotly.min.js'

// custom modules

import './app.sass'
import './index.pug'

// verification results

import verification from './res/verification.json'

///////////////////////////////////////////////////////

const opt = {
  boxPlot: {
    boxmean   : 'sd',
    boxpoints : 'all',
    type      : 'box'
  },
  colors: ['#3D9970', '#FF4136', '#FF851B'],
  layout: {
    autosize: true
  },
  theme: location.hash.replace('#', '')
}

const app = {
  data: {
    subjects: {
      fScore    : Object.assign({ marker: { color: opt.colors[0] }, name: 'F-score',   y: [] }, opt.boxPlot),
      precision : Object.assign({ marker: { color: opt.colors[1] }, name: 'Precision', y: [] }, opt.boxPlot),
      recall    : Object.assign({ marker: { color: opt.colors[2] }, name: 'Recall',    y: [] }, opt.boxPlot)
    }
  }
}

for (let subjectID in verification[opt.theme].subjects) {
  app.data.subjects.fScore.y.push(verification[opt.theme].subjects[subjectID].fScore)
  app.data.subjects.precision.y.push(verification[opt.theme].subjects[subjectID].pre)
  app.data.subjects.recall.y.push(verification[opt.theme].subjects[subjectID].rec)
}

Plotly.newPlot('subjects', [app.data.subjects.fScore, app.data.subjects.precision, app.data.subjects.recall], Object.assign({ title: "Subjects' Verification" }, opt.layout))
