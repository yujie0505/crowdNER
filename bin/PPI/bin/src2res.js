const fs = require('fs')
const google = require('edit-google-spreadsheet')

const opt = Object.assign({
  debug  : true,
  entity : ['event', 'protein'],
  google : JSON.parse(fs.readFileSync('../../../option.json', 'utf-8')).google,
  resPath : '../res',
  srcPath : '../src',
  stcLevel : [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1], // required amount of words labeled as important to next sentence level
  worksheetCol : {
    avgLabelRate: {
      stcInfo  : 1,
      stcLevel : 2
    },
    avgSubmitTime : {
      stcInfo  : 1,
      stcLevel : 2
    },
    enroll : {
      degree     : 5,
      department : 4,
      expID      : 6,
      name       : 2,
      studentID  : 3
    }
  },
  world : {
    abbr    : 'PPI',
    content : 'Protein-Protein Interaction'
  }
}, require('node-getopt').create([
  ['c', 'minConf=ARG'         , 'minimum confidence'],
  ['d', 'diagram=ARG'         , 'send data points to google spreadsheet for drawing Scatter plot'],
  ['e', 'eventThreshold=ARG'  , 'threshold of likelihood between event entity and each word'],
  ['h', 'help'                , 'show this help'],
  ['p', 'proteinThreshold=ARG', 'threshold of likelihood between protein entity and each word'],
  ['s', 'minSupp=ARG'         , 'minimum support'],
]).bindHelp('\nUsage: node src2res.js\n[[OPTIONS]]\n').parseSystem().options)

opt.eventThreshold = parseFloat(opt.eventThreshold)
opt.proteinThreshold = parseFloat(opt.proteinThreshold)

// load src

const src = {
  ans : fs.readdirSync(`${opt.srcPath}/ans/`),
  art : {},
  box : fs.readdirSync(`${opt.srcPath}/box/`).filter(it => it.match(/^box\d+$/)),
  exp : fs.readdirSync(`${opt.srcPath}/exp/`)
}

// utility

const ariMean = arr => arr.reduce((sum, val) => { return sum + val }, 0) / arr.length

const geoMean = arr => Math.pow(arr.reduce((pro, val) => { return pro * val }, 1), 1 / arr.length)

const getLevel = importantRate => {
  for (let l in opt.stcLevel) {
    if      (importantRate === opt.stcLevel[l]) return parseInt(l)
    else if (importantRate < opt.stcLevel[l])   return parseInt(l) -1
  }

  return opt.stcLevel.length - 1
}

const labeledStc = {}
const parseLog = ($src, res) => {
  for (let srcID of src[$src]) {

    let lastSubmitTime = null, elapsedTime = 0
    for (let log of fs.readFileSync(`${opt.srcPath}/${$src}/${srcID}`, 'utf-8').split('\n').slice(0, -1)) {
      log = JSON.parse(log)

      let currSubmitTime = new Date(log.time) / 1000
      if (lastSubmitTime) elapsedTime = currSubmitTime - lastSubmitTime
      lastSubmitTime = currSubmitTime

      if ('submit' !== log.action) continue

      // parse submit logs

      let boxName = `box${log.box}`
      let box = res[boxName] ? res[boxName] : res[boxName] = { submits: 0 }
      let labeler = box[srcID] ? box[srcID] : box[srcID] = {}
      let article = labeler[log.pmid] ? labeler[log.pmid] : labeler[log.pmid] = {}
      let sentence = article[log.stcid] ? article[log.stcid] : article[log.stcid] = {
        elapsedTime : elapsedTime,
        event: {},
        protein: {}
      }

      box.submits++
      for (let e of opt.entity)
        for (let i of log[e])
          sentence[e][i] = true

      if ('ans' === $src) continue

      // statistic of sentences labeled by subjects

      box = labeledStc[boxName] ? labeledStc[boxName] : labeledStc[boxName] = {}
      let art = box[log.pmid] ? box[log.pmid] : box[log.pmid] = {}
      let stc = art[log.stcid] ? art[log.stcid] : art[log.stcid] = { elapsedTime: [], labeler: {} }
      if (stc.labeler[srcID]) continue // repeated labeled
      if (elapsedTime) stc.elapsedTime.push(elapsedTime)
      stc.labeler[srcID] = true
    }
  }
}

google.load({
  debug         : opt.debug,
  oauth2        : opt.google.oauth2,
  spreadsheetId : opt.google.spreadsheet,
  worksheetId   : opt.google.worksheet.enroll
}, (err, sheet) => {
  if (err) throw err

  sheet.receive((err, rows) => {
    if (err) throw err

    delete rows[1]

    // parse subject information

    const idHash = {}, subject = {}
    let col = opt.worksheetCol.enroll
    for (let i in rows) {
      idHash[rows[i][col.expID]] = rows[i][col.studentID]
      if (subject[rows[i][col.studentID]])
        subject[rows[i][col.studentID]].expID.push(rows[i][col.expID])
      else {
        let degree_grade = rows[i][col.degree].split('_')
        subject[rows[i][col.studentID]] = {
          degree     : degree_grade[0],
          department : rows[i][col.department],
          expID      : [rows[i][col.expID]],
          grade      : degree_grade[1],
          name       : rows[i][col.name]
        }
      }
    }
    fs.writeFileSync(`${opt.resPath}/subject.json`, JSON.stringify(subject, null, 2))

    // parse answer logs

    const answer = {}
    parseLog('ans', answer)
    fs.writeFileSync(`${opt.resPath}/answer.json`, JSON.stringify(answer, null, 2))

    // parse experiment logs

    const expResult = {}
    parseLog('exp', expResult)
    fs.writeFileSync(`${opt.resPath}/result.json`, JSON.stringify(expResult, null, 2))

    // parse world information

    const world = Object.assign({}, opt.world, { box: {} })
    for (let boxName of src.box) {
      let box = world.box[`${boxName.slice(0, 1).toUpperCase()}${boxName.slice(1, -1)} ${boxName.slice(-1)}`] = { articles: {} }

      for (let pmid of fs.readdirSync(`${opt.srcPath}/box/${boxName}`).filter(it => it.match(/\d+/))) {
        src.art[pmid] = JSON.parse(fs.readFileSync(`${opt.srcPath}/box/${boxName}/${pmid}`, 'utf-8'))
        box.articles[pmid] = src.art[pmid].title
      }

      let student = {}
      for (let expID in expResult[boxName])
        student[idHash[expID]] = true

      let boxStack = JSON.parse(fs.readFileSync(`${opt.srcPath}/box/${boxName}/stack`))

      box.statistic = {
        answers  : answer[boxName] ? Object.keys(answer[boxName]).length - 1 : 0,
        articles : Object.keys(box.articles).length,
        stcValue : {
          '0': boxStack[0].length,
          '1': boxStack[1].length,
          '2': boxStack[2].length
        },
        subjects   : Object.keys(student).length,
        submits    : expResult[boxName] ? expResult[boxName].submits : 0,
        updateTime : new Date().toISOString().slice(0, 10).replace(/-/g, '.')
      }
    }
    fs.writeFileSync(`${opt.resPath}/world.json`, JSON.stringify(world, null, 2))

    // comparison: 'time required to finish a submit' vs. 'sentence length' via different 'sentence level'

    switch (opt.diagram) {
      case 'avgSubmitTime':
        google.load({
          debug         : opt.debug,
          oauth2        : opt.google.oauth2,
          spreadsheetId : opt.google.spreadsheet,
          worksheetId   : opt.google.worksheet.avgSubmitTime
        }, (err, sheet) => {
          if (err) throw err

          sheet.receive((err, rows, info) => {
            if (err) throw err

            let rowIndex = info.nextRow, statistic = {}
            for (let boxName in labeledStc) {
              for (let pmid in labeledStc[boxName]) {
                for (let stcid in labeledStc[boxName][pmid]) {
                  let stcSupp = labeledStc[boxName][pmid][stcid].supp = Object.keys(labeledStc[boxName][pmid][stcid].labeler).length
                  if (opt.minSupp > stcSupp) continue

                  let importantWords = 0, likelihood = src.art[pmid].likelihood

                  for (let wid in src.art[pmid].word[stcid])
                    if (parseFloat(likelihood.event[stcid][wid]) >= opt.eventThreshold || parseFloat(likelihood.protein[stcid][wid]) >= opt.proteinThreshold)
                      importantWords++

                  let importantRate = importantWords / src.art[pmid].word[stcid].length
                  statistic[rowIndex++] = {
                    [opt.worksheetCol.avgSubmitTime.stcInfo]: importantRate,
                    [opt.worksheetCol.avgSubmitTime.stcLevel + getLevel(importantRate)]: ariMean(labeledStc[boxName][pmid][stcid].elapsedTime)
                  }
                }
              }
            }

            sheet.add(statistic)
            sheet.send(err => {
              if (err) throw err
            })
          })
        })
        break

      case 'avgLabelRate':
        google.load({
          debug         : opt.debug,
          oauth2        : opt.google.oauth2,
          spreadsheetId : opt.google.spreadsheet,
          worksheetId   : opt.google.worksheet.avgLabelRate
        }, (err, sheet) => {
          if (err) throw err

          sheet.receive((err, rows, info) => {
            if (err) throw err

            let rowIndex = info.nextRow, statistic = {}
            for (let boxName in labeledStc) {
              for (let pmid in labeledStc[boxName]) {
                for (let stcid in labeledStc[boxName][pmid]) {
                  let stcSupp = labeledStc[boxName][pmid][stcid].supp = Object.keys(labeledStc[boxName][pmid][stcid].labeler).length
                  if (opt.minSupp > stcSupp) continue

                  let importantWords = {}, labelRate = []
                  for (let wid in src.art[pmid].word[stcid]) {
                    for (let entity of opt.entity) {
                      if (parseFloat(src.art[pmid].likelihood[entity][stcid][wid]) >= opt[`${entity}Threshold`]) {
                        importantWords[wid] = 0

                        for (let expID in labeledStc[boxName][pmid][stcid].labeler)
                          if (expResult[boxName][expID][pmid][stcid][entity][wid])
                            importantWords[wid]++

                        labelRate.push((importantWords[wid] ? importantWords[wid] : 1) / stcSupp)
                      }
                    }
                  }

                  let importantRate = Object.keys(importantWords).length / src.art[pmid].word[stcid].length

                  statistic[rowIndex++] = {
                    [opt.worksheetCol.avgLabelRate.stcInfo]: importantRate,
                    [opt.worksheetCol.avgLabelRate.stcLevel + getLevel(importantRate)]: labelRate.length ? geoMean(labelRate) : 0
                  }
                }
              }
            }

            sheet.add(statistic)
            sheet.send(err => {
              if (err) throw err
            })
          })
        })
        break
    }
  })
})
