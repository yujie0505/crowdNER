'use strict'

// web framework

import Plotly from 'plotly.js/dist/plotly.min.js'

// custom modules

import './app.sass'
import './index.pug'

///////////////////////////////////////////////////////

const opt = {
  boxPlot: {
    boxmean   : 'sd',
    boxpoints : 'Outliers',
    type      : 'box'
  },
  colors: ['#3D9970', '#FF4136', '#FF851B'],
  layout: {
    autosize: true,
    height: 700,
    yaxis: { range: [0, 1] }
  },
  scatter: {
    mode: 'markers',
    type: 'scatter'
  },
  showResult: location.hash.replace('#', ''),
  theme: location.search.replace('?theme=', '')
}

const app = {
  dataPoints: {
    verification: {}
  },
  resources: {
    verification: require(`./res/verify/${opt.theme}/verification.json`)
  }
}

const build_line_points = (data, size) => {
  let linePoints = []
  for (let i = 0; i < size; i++)
    linePoints.push(data)

  return linePoints
}

switch (opt.showResult) {
  case 'subjects':
    app.dataPoints.verification.subjects = {
      fScore    : { marker: { color: opt.colors[0] }, name: 'F-score',   y: [] },
      precision : { marker: { color: opt.colors[1] }, name: 'Precision', y: [] },
      recall    : { marker: { color: opt.colors[2] }, name: 'Recall',    y: [] },
      subjectID : []
    }

    for (let subjectID in app.resources.verification.subjects) {
      app.dataPoints.verification.subjects.fScore.y.push(app.resources.verification.subjects[subjectID].fScore)
      app.dataPoints.verification.subjects.precision.y.push(app.resources.verification.subjects[subjectID].pre)
      app.dataPoints.verification.subjects.recall.y.push(app.resources.verification.subjects[subjectID].rec)
      app.dataPoints.verification.subjects.subjectID.push(subjectID)
    }

    // subjects.boxPlot

    Plotly.newPlot('subjects_boxPlot', [
      Object.assign(app.dataPoints.verification.subjects.fScore, opt.boxPlot),
      Object.assign(app.dataPoints.verification.subjects.precision, opt.boxPlot),
      Object.assign(app.dataPoints.verification.subjects.recall, opt.boxPlot)
    ], Object.assign({ title: "Subjects' Verification" }, opt.layout))

    let verificationRlt = document.getElementById('subjects_boxPlot').calcdata
    let numPoints = app.dataPoints.verification.subjects.subjectID.length

    Plotly.newPlot('subjects_scatter_fScore', [
      Object.assign(app.dataPoints.verification.subjects.fScore, { x: app.dataPoints.verification.subjects.subjectID }, opt.scatter),
      Object.assign({ name: 'box plot minimum', x: app.dataPoints.verification.subjects.subjectID, y: build_line_points(verificationRlt[0][0].lf, numPoints) }, { type: opt.scatter.type }),
      Object.assign({ name: 'box plot maximum', x: app.dataPoints.verification.subjects.subjectID, y: build_line_points(verificationRlt[0][0].uf, numPoints) }, { type: opt.scatter.type }),
      Object.assign({ name: 'double stdDev minimum', x: app.dataPoints.verification.subjects.subjectID, y: build_line_points(verificationRlt[0][0].mean - 2 * verificationRlt[0][0].sd, numPoints) }, { type: opt.scatter.type }),
      Object.assign({ name: 'double stdDev maximum', x: app.dataPoints.verification.subjects.subjectID, y: build_line_points(verificationRlt[0][0].mean + 2 * verificationRlt[0][0].sd, numPoints) }, { type: opt.scatter.type })
    ], Object.assign({ title: "Subjects' Verification fScore" }, opt.layout))

    Plotly.newPlot('subjects_scatter_precision', [
      Object.assign(app.dataPoints.verification.subjects.precision, { x: app.dataPoints.verification.subjects.subjectID }, opt.scatter),
      Object.assign({ name: 'box plot minimum', x: app.dataPoints.verification.subjects.subjectID, y: build_line_points(verificationRlt[1][0].lf, numPoints) }, { type: opt.scatter.type }),
      Object.assign({ name: 'box plot maximum', x: app.dataPoints.verification.subjects.subjectID, y: build_line_points(verificationRlt[1][0].uf, numPoints) }, { type: opt.scatter.type }),
      Object.assign({ name: 'double stdDev minimum', x: app.dataPoints.verification.subjects.subjectID, y: build_line_points(verificationRlt[1][0].mean - 2 * verificationRlt[1][0].sd, numPoints) }, { type: opt.scatter.type }),
      Object.assign({ name: 'double stdDev maximum', x: app.dataPoints.verification.subjects.subjectID, y: build_line_points(verificationRlt[1][0].mean + 2 * verificationRlt[1][0].sd, numPoints) }, { type: opt.scatter.type })
    ], Object.assign({ title: "Subjects' Verification precision" }, opt.layout))

    Plotly.newPlot('subjects_scatter_recall', [
      Object.assign(app.dataPoints.verification.subjects.recall, { x: app.dataPoints.verification.subjects.subjectID }, opt.scatter),
      Object.assign({ name: 'box plot minimum', x: app.dataPoints.verification.subjects.subjectID, y: build_line_points(verificationRlt[2][0].lf, numPoints) }, { type: opt.scatter.type }),
      Object.assign({ name: 'box plot maximum', x: app.dataPoints.verification.subjects.subjectID, y: build_line_points(verificationRlt[2][0].uf, numPoints) }, { type: opt.scatter.type }),
      Object.assign({ name: 'double stdDev minimum', x: app.dataPoints.verification.subjects.subjectID, y: build_line_points(verificationRlt[2][0].mean - 2 * verificationRlt[2][0].sd, numPoints) }, { type: opt.scatter.type }),
      Object.assign({ name: 'double stdDev maximum', x: app.dataPoints.verification.subjects.subjectID, y: build_line_points(verificationRlt[2][0].mean + 2 * verificationRlt[2][0].sd, numPoints) }, { type: opt.scatter.type })
    ], Object.assign({ title: "Subjects' Verification recall" }, opt.layout))

    break;

  case 'crowdSourcing':
    break;

  case 'simulation':
    break;
}
