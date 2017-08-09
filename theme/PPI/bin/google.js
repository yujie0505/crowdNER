const fs = require('fs')
const google = require('edit-google-spreadsheet')

const opt = Object.assign({
  debug   : true,
  entity  : ['event', 'protein'],
  google  : JSON.parse(fs.readFileSync('../../../option.json', 'utf-8')).google,
  maxSupp : 20,
  resPath : '../res',
  srcPath : '../src',
  stcLevel : [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1], // required amount of words labeled as important to next sentence level
  worksheetCol : {
    avgSubmitTime : {
      stcInfo  : 1,
      stcLevel : 2
    },
    verification : {
      FN        : 8,
      FP        : 7,
      FScore    : 12,
      minSupp   : 1,
      precision : 11,
      recall    : 10,
      stcInfo   : {
        total : 2,
        value : {
          '0' : 3,
          '1' : 4,
          '2' : 5
        }
      },
      TN        : 9,
      TP        : 6
    },
    wordLabeled : {
      eveLikelihood : {
        eveLabel : 3,
        noLabel  : 4,
        proLabel : 2
      },
      proLikelihood : 1
    }
  }
}, require('node-getopt').create([
  ['c', 'minConf=ARG'         , 'minimum confidence'],
  ['e', 'eventThreshold=ARG'  , 'threshold of likelihood for a word be regarded as event entity'],
  ['h', 'help'                , 'show this help'],
  ['p', 'proteinThreshold=ARG', 'threshold of likelihood for a word be regarded as protein entity'],
  ['s', 'minSupp=ARG'         , 'minimum support'],
  ['w', 'worksheet=ARG'       , 'send data points to google spreadsheet for drawing Scatter plot']
]).bindHelp('\nUsage: node src2res.js\n[[OPTIONS]]\n').parseSystem().options)

opt.eventThreshold = parseFloat(opt.eventThreshold)
opt.proteinThreshold = parseFloat(opt.proteinThreshold)

// load src

const src = {
  answers    : JSON.parse(fs.readFileSync(`${opt.resPath}/answer.json`, 'utf-8')),
  articles   : {},
  expResult  : JSON.parse(fs.readFileSync(`${opt.resPath}/result.json`, 'utf-8')),
  labeledStc : JSON.parse(fs.readFileSync(`${opt.resPath}/labeledStc.json`, 'utf-8')),
  stcValue   : JSON.parse(fs.readFileSync(`${opt.resPath}/stcValue.json`, 'utf-8'))
}

for (let boxName in src.labeledStc)
  for (let pmid in src.labeledStc[boxName])
    src.articles[pmid] = JSON.parse(fs.readFileSync(`${opt.srcPath}/box/${boxName}/${pmid}`, 'utf-8'))

// utility

const ariMean = arr => arr.reduce((sum, val) => { return sum + val }, 0) / arr.length

const getLevel = importantRate => {
  for (let l in opt.stcLevel) {
    if      (importantRate === opt.stcLevel[l]) return parseInt(l)
    else if (importantRate < opt.stcLevel[l])   return parseInt(l) -1
  }

  return opt.stcLevel.length - 1
}

switch (opt.worksheet) {
  case 'avgSubmitTime' :
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
        for (let boxName in src.labeledStc) {
          for (let pmid in src.labeledStc[boxName]) {
            for (let stcid in src.labeledStc[boxName][pmid]) {
              if (opt.minSupp > src.labeledStc[boxName][pmid][stcid].supp) continue

              let importantWords = 0, likelihood = src.articles[pmid].likelihood
              for (let wid in src.articles[pmid].word[stcid])
                if (parseFloat(likelihood.event[stcid][wid]) >= opt.eventThreshold || parseFloat(likelihood.protein[stcid][wid]) >= opt.proteinThreshold)
                  importantWords++

              let importantRate = importantWords / src.articles[pmid].word[stcid].length
              statistic[rowIndex++] = {
                [opt.worksheetCol.avgSubmitTime.stcInfo]: importantRate,
                [opt.worksheetCol.avgSubmitTime.stcLevel + getLevel(importantRate)]: ariMean(src.labeledStc[boxName][pmid][stcid].elapsedTime)
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

  case 'wordLabeled' :
    google.load({
      debug         : opt.debug,
      oauth2        : opt.google.oauth2,
      spreadsheetId : opt.google.spreadsheet,
      worksheetId   : opt.google.worksheet.wordLabeled
    }, (err, sheet) => {
      if (err) throw err

      sheet.receive((err, rows, info) => {
        if (err) throw err

        let rowIndex = info.nextRow, statistic = {}
        for (let boxName in src.labeledStc) {
          for (let pmid in src.labeledStc[boxName]) {
            for (let stcid in src.labeledStc[boxName][pmid]) {
              let stcSupp = src.labeledStc[boxName][pmid][stcid].supp
              if (opt.minSupp > stcSupp) continue

              let words = {}
              for (let expID in src.labeledStc[boxName][pmid][stcid].labeler) {
                for (let entity of opt.entity) {
                  for (let wid in src.expResult[boxName][expID][pmid][stcid][entity]) {
                    let word = words[wid] ? words[wid] : words[wid] = { event: 0, protein: 0 }
                    word[entity]++
                  }
                }
              }

              for (let wid in words) {
                let label = 'noLabel'
                if (words[wid].event > words[wid].protein && opt.minConf <= words[wid].event / stcSupp)
                  label = 'eveLabel'
                else if (words[wid].protein > words[wid].event && opt.minConf <= words[wid].protein / stcSupp)
                  label = 'proLabel'

                statistic[rowIndex++] = {
                  [opt.worksheetCol.wordLabeled.proLikelihood]: src.articles[pmid].likelihood.protein[stcid][wid],
                  [opt.worksheetCol.wordLabeled.eveLikelihood[label]]: src.articles[pmid].likelihood.event[stcid][wid]
                }
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

  case 'verification' :
    google.load({
      debug         : opt.debug,
      oauth2        : opt.google.oauth2,
      spreadsheetId : opt.google.spreadsheet,
      worksheetId   : opt.google.worksheet.verification
    }, (err, sheet) => {
      if (err) throw err

      sheet.receive((err, rows, info) => {
        if (err) throw err

        let rowIndex = info.nextRow, statistic = {}
        for (let minSupp = 1; minSupp <= opt.maxSupp; minSupp++) {
          let result = {
            FN : 0,
            FP : 0,
            stcInfo : {
              total : 0,
              value : {
                '0' : 0,
                '1' : 0,
                '2' : 0
              }
            },
            TN : 0,
            TP : 0
          }

          for (let pmid in src.answers.box1.tseng) { //-! only take box1 in consideration and answers from prof. Tseng
            for (let stcid in src.answers.box1.tseng[pmid]) {
              let _answerStc = src.answers.box1.tseng[pmid][stcid], _labeledStc = src.labeledStc.box1[pmid][stcid]

              if (!_labeledStc || _labeledStc.supp < minSupp) continue

              result.stcInfo.total++
              result.stcInfo.value[`${src.stcValue.box1[pmid][stcid]}`]++

              for (let wid in src.articles[pmid].word[stcid]) {
                if (_answerStc.protein[wid]) {
                  if (_labeledStc.labels[wid] && (opt.minConf <= _labeledStc.labels[wid].protein / _labeledStc.supp)) result.TP++
                  else result.FN++
                }
                else {
                  if (_labeledStc.labels[wid] && (opt.minConf <= _labeledStc.labels[wid].protein / _labeledStc.supp)) result.FP++
                  else result.TN++
                }
              }
            }
          }

          result.precision = result.TP / (result.TP + result.FP)
          result.recall = result.TP / (result.TP + result.FN)

          statistic[rowIndex++] = {
            [opt.worksheetCol.verification.FN]: result.FN,
            [opt.worksheetCol.verification.FP]: result.FP,
            [opt.worksheetCol.verification.FScore]: 2 * result.precision * result.recall / (result.precision + result.recall),
            [opt.worksheetCol.verification.minSupp]: minSupp,
            [opt.worksheetCol.verification.precision]: result.precision,
            [opt.worksheetCol.verification.recall]: result.recall,
            [opt.worksheetCol.verification.stcInfo.total]: result.stcInfo.total,
            [opt.worksheetCol.verification.stcInfo.value['0']]: result.stcInfo.value['0'],
            [opt.worksheetCol.verification.stcInfo.value['1']]: result.stcInfo.value['1'],
            [opt.worksheetCol.verification.stcInfo.value['2']]: result.stcInfo.value['2'],
            [opt.worksheetCol.verification.TN]: result.TN,
            [opt.worksheetCol.verification.TP]: result.TP
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
