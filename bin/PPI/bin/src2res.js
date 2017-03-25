const fs = require('fs')
const google = require('edit-google-spreadsheet')

const opt = {
  debug   : true,
  google  : JSON.parse(fs.readFileSync('../../../option.json', 'utf-8')).google,
  resPath : '../res',
  sheet   : {
    degree     : 5,
    department : 4,
    expID      : 6,
    name       : 2,
    studentID  : 3
  },
  srcPath : '../src'
}

// utility

const parseLog = ($src, res) => {
  for (let srcID of src[$src]) {
    for (let log of fs.readFileSync(`${opt.srcPath}/${$src}/${srcID}/log`, 'utf-8').split('\n').slice(0, -1)) {
      log = JSON.parse(log)

      if ('submit' !== log.action) continue

      let boxName = `box${log.box}`
      let box = res[boxName] ? res[boxName] : res[boxName] = {}
      let labeler = box[srcID] ? box[srcID] : box[srcID] = {}
      let article = labeler[log.pmid] ? labeler[log.pmid] : labeler[log.pmid] = {}
      article[log.stcid] = {
        event   : log.event,
        protein : log.protein
      }
    }
  }
}

// load src

const src = {
  ans     : fs.readdirSync(`${opt.srcPath}/ans/`),
  box     : fs.readdirSync(`${opt.srcPath}/box/`).filter(it => it.match(/^box\d+$/)),
  exp     : fs.readdirSync(`${opt.srcPath}/exp/`),
  ppiPair : fs.readFileSync(`${opt.srcPath}/PINDB.tab.txt`, 'utf-8').split('\n').slice(1, -1)
}

const answer = {}
const expResult = {}
const subject = {}
const world = {
  abbr : 'PPI',
  box  : {},
  name : 'Protein-Protein Interaction'
}

google.load({
  debug         : opt.debug,
  oauth2        : opt.google.oauth2,
  spreadsheetId : opt.google.spreadsheet,
  worksheetId   : opt.google.worksheet
}, (err, sheet) => {
  if (err) throw err

  sheet.receive((err, rows, info) => {
    if (err) throw err

    delete rows[1]

    // parse subject information

    let idHash = {}
    for (let i in rows) {
      idHash[rows[i][opt.sheet.expID]] = rows[i][opt.sheet.studentID]
      if (subject[rows[i][opt.sheet.studentID]])
        subject[rows[i][opt.sheet.studentID]].expID.push(rows[i][opt.sheet.expID])
      else {
        let degree_grade = rows[i][opt.sheet.degree].split('_')
        subject[rows[i][opt.sheet.studentID]] = {
          degree     : degree_grade[0],
          department : rows[i][opt.sheet.department],
          expID      : [rows[i][opt.sheet.expID]],
          grade      : degree_grade[1],
          name       : rows[i][opt.sheet.name]
        }
      }
    }
    fs.writeFileSync(`${opt.resPath}/subject.json`, JSON.stringify(subject, null, 2))

    // parse answer logs

    parseLog('ans', answer)
    fs.writeFileSync(`${opt.resPath}/answer.json`, JSON.stringify(answer, null, 2))

    // parse experiment logs

    parseLog('exp', expResult)
    fs.writeFileSync(`${opt.resPath}/result.json`, JSON.stringify(expResult, null, 2))

    // parse world information

    for (let boxName of src.box) {
      let box = world.box[boxName.substring(0, 1).toUpperCase() + boxName.substring(1)] = {}

      box.articles = {}
      for (let pmid of fs.readdirSync(`${opt.srcPath}/box/${boxName}`).filter(it => it.match(/\d+/)))
        box.articles[pmid] = JSON.parse(fs.readFileSync(`${opt.srcPath}/box/${boxName}/${pmid}`, 'utf-8')).title

      let logs = 0, student = {}
      if (expResult[boxName]) {
        for (let expID in expResult[boxName]) {
          student[idHash[expID]] = true
          for (let pmid in expResult[boxName][expID])
            logs += Object.keys(expResult[boxName][expID][pmid]).length
        }
      }

      box.statistic = {
        answer      : answer[boxName] ? Object.keys(answer[boxName]).length : 0,
        article     : Object.keys(box.articles).length,
        expLogs     : logs,
        subject     : Object.keys(student).length,
        twoValueStc : JSON.parse(fs.readFileSync(`${opt.srcPath}/box/${boxName}/stack`))[2].length
      }
    }
    fs.writeFileSync('../res/world.json', JSON.stringify(world, null, 2))
  })
})
