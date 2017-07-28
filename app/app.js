'use strict'

// web framework

import Plotly from 'plotly.js/dist/plotly.min.js'

// custom modules

import './app.sass'
import './index.pug'

///////////////////////////////////////////////////////

const opt = {
  box_plot: {
    boxmean   : 'sd',
    boxpoints : 'Outliers',
    type      : 'box'
  },
  colors: ['9d8df1', '7ebdc3', 'fbacbe', 'a18276'],
  layout: {
    autosize : true,
    height   : 700,
    legend   : { orientation: 'h', y: -0.12 }
  },
  scatter_plot: {
    mode: 'lines',
    type: 'scatter'
  },
  show_result: location.hash.replace('#', ''),
  theme: location.search.match(/theme=(\w+)/)[1]
}

// utility

const buildHorizontalLine = (value, size) => {
  let points = []
  while (size--)
    points.push(value)

  return points
}

///////////////////////////////////////////////////////

switch (opt.show_result) {
  case 'subjects':
    const scores = [], subjects = []

    for (let labeler of require(`./res/verify/${opt.theme}/labeler-score.json`)) {
      scores.push(labeler.score)
      subjects.push(labeler.sid)
    }

    const data = { name: 'Labeler Score', y: scores }
    Plotly.newPlot('labeler_score_boxPlot', [ Object.assign(data, opt.box_plot) ], opt.layout)

    const statistics = document.getElementById('labeler_score_boxPlot').calcdata[0][0]
    Plotly.newPlot('labeler_score_scatterPlot', [
      Object.assign(data, { mode: 'markers', type: 'scatter', x: subjects }),
      Object.assign({ name: 'Double StdDev Minimum', x: subjects, y: buildHorizontalLine((statistics.mean - 2 * statistics.sd), subjects.length) }, opt.scatter_plot),
      Object.assign({ name: 'Double StdDev Maximum', x: subjects, y: buildHorizontalLine((statistics.mean + 2 * statistics.sd), subjects.length) }, opt.scatter_plot),
      Object.assign({ name: 'Box Plot Minimum',      x: subjects, y: buildHorizontalLine(statistics.lf, subjects.length) }, opt.scatter_plot),
      Object.assign({ name: 'Box Plot Maximum',      x: subjects, y: buildHorizontalLine(statistics.uf, subjects.length) }, opt.scatter_plot)
    ], opt.layout)

    break;

  case 'crowdSourcing':
    const verification = require(`./res/verify/${opt.theme}/verification.${location.search.match(/source=(\w+)/)[1]}.json`)

    const verify_rlt = { fScore: {}, pre: {}, rec: {} }
    for (let support in verification.crowdSourcing) {
      for (let confidence in verification.crowdSourcing[support]) {
        if ('NER' === opt.theme && ('0.3' === confidence || '0.4' === confidence)) continue

        for (let statistics in verify_rlt) {
          let trace = verify_rlt[statistics][confidence] ? verify_rlt[statistics][confidence] : verify_rlt[statistics][confidence] = { name: `Confidence = ${confidence}`, x: [], y: [] }

          trace.x.push(support)
          trace.y.push(verification.crowdSourcing[support][confidence][statistics])
        }
      }
    }

    const titles = { fScore: 'FScore', pre: 'Precision', rec: 'Recall' }
    for (let statistics in verify_rlt) {
      let traces = []

      for (let confidence in verify_rlt[statistics])
        traces.push(Object.assign(verify_rlt[statistics][confidence], opt.scatter_plot))

      Plotly.newPlot(`crowdSourcing_verification_${titles[statistics]}`, traces, Object.assign({ title: `CrowdSourcing Verification ${titles[statistics]}` }, opt.layout))
    }

    break;

  case 'simulation':
    const simulation = require(`./res/verify/${opt.theme}/sim-verification.json`)

    const traces = []
    for (let category in simulation) {
      let trace = { name: category, x: [], y: [] }

      for (let support in simulation[category]) {
        trace.x.push(support)
        trace.y.push(simulation[category][support]['0.5'].rec)
      }

      traces.push(Object.assign(trace, opt.scatter_plot))
    }
    traces.push(Object.assign({ name: 'expert', x: traces[0].x, y: buildHorizontalLine(0.9, traces[0].x.length) }, opt.scatter_plot))

    Plotly.newPlot('simulation_verification', traces, Object.assign({ xaxis: { title: 'Simulation Amounts' }, yaxis: { range: [0, 1], title: 'Sensitivity' } }, opt.layout))

    break;
}
