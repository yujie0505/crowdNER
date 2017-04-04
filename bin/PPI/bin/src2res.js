const fs = require('fs')
const google = require('edit-google-spreadsheet')

const opt = {
  debug  : true,
  entity : ['event', 'protein'],
  google : JSON.parse(fs.readFileSync('../../../option.json', 'utf-8')).google,
  resPath : '../res',
  srcPath : '../src',
  worksheetCol : {
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
}

// load src

const src = {
  ans : fs.readdirSync(`${opt.srcPath}/ans/`),
  box : fs.readdirSync(`${opt.srcPath}/box/`).filter(it => it.match(/^box\d+$/)),
  exp : fs.readdirSync(`${opt.srcPath}/exp/`)
}

// utility

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
        event : {},
        protein : {}
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

    const stcValue = {}, world = Object.assign({}, opt.world, { box: {} })
    for (let boxName of src.box) {
      let box = world.box[`${boxName.slice(0, 1).toUpperCase()}${boxName.slice(1, -1)} ${boxName.slice(-1)}`] = { articles: {} }

      for (let pmid of fs.readdirSync(`${opt.srcPath}/box/${boxName}`).filter(it => it.match(/\d+/)))
        box.articles[pmid] = JSON.parse(fs.readFileSync(`${opt.srcPath}/box/${boxName}/${pmid}`, 'utf-8')).title

      let student = {}
      for (let expID in expResult[boxName])
        student[idHash[expID]] = true

      let boxStack = JSON.parse(fs.readFileSync(`${opt.srcPath}/box/${boxName}/stack`))

      // parse sentence value

      stcValue[boxName] = {}
      for (let val in boxStack) {
        for (let stc of boxStack[val]) {
          let art = stcValue[boxName][stc[0]] ? stcValue[boxName][stc[0]] : stcValue[boxName][stc[0]] = {}
          art[stc[1]] = parseInt(val)
        }
      }

      box.statistic = {
        answers  : answer[boxName] ? Object.keys(answer[boxName]).length - 1 : 0,
        articles : Object.keys(box.articles).length,
        stcValue : {
          '0' : boxStack[0].length,
          '1' : boxStack[1].length,
          '2' : boxStack[2].length
        },
        subjects   : Object.keys(student).length,
        submits    : expResult[boxName] ? expResult[boxName].submits : 0,
        updateTime : new Date().toISOString().slice(0, 10).replace(/-/g, '.')
      }
    }
    fs.writeFileSync(`${opt.resPath}/world.json`, JSON.stringify(world, null, 2))
    fs.writeFileSync(`${opt.resPath}/stcValue.json`, JSON.stringify(stcValue, null, 2))

    // record labeled sentence

    for (let boxName in labeledStc) {
      for (let pmid in labeledStc[boxName]) {
        for (let stcid in labeledStc[boxName][pmid]) {
          labeledStc[boxName][pmid][stcid].supp = Object.keys(labeledStc[boxName][pmid][stcid].labeler).length

          let labels = labeledStc[boxName][pmid][stcid].labels = {}
          for (let expID in labeledStc[boxName][pmid][stcid].labeler) {
            for (let entity of opt.entity) {
              for (let wid in expResult[boxName][expID][pmid][stcid][entity]) {
                let wordLabel = labels[wid] ? labels[wid] : labels[wid] = { event: 0, protein: 0 }
                wordLabel[entity]++
              }
            }
          }
        }
      }
    }
    fs.writeFileSync(`${opt.resPath}/labeledStc.json`, JSON.stringify(labeledStc, null, 2))
  })
})
