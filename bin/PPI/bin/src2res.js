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
    name       : 2
  },
  srcPath : '../src'
}

// load src

const src = {
  ans     : fs.readdirSync(`${opt.srcPath}/ans/`),
  box     : fs.readdirSync(`${opt.srcPath}/box/`).filter(it => it.match(/^box\d+$/)),
  log     : fs.readdirSync(`${opt.srcPath}/log/`),
  ppiPair : fs.readFileSync(`${opt.srcPath}/PINDB.tab.txt`, 'utf-8').split('\n').slice(1, -1)
}

const answer = {}
const result = {}
const subject = {}
const world = {
  abbr : 'PPI',
  box  : {},
  name : 'Protein-Protein Interaction'
}

// parse subject information

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

    for (let i in rows) {
      let degree_grade = rows[i][opt.sheet.degree].split('_')
      subject[rows[i][opt.sheet.expID]] = {
        degree     : degree_grade[0],
        department : rows[i][opt.sheet.department],
        grade      : degree_grade[1],
        name       : rows[i][opt.sheet.name]
      }
    }

    fs.writeFileSync(`${opt.resPath}/subject.json`, JSON.stringify(subject, null, 2))

    // parse answer

    for (let ans of src.ans) {
      for (let log of fs.readFileSync(`${opt.srcPath}/ans/${ans}`, 'utf-8').split('\n').slice(0, -1)) {
        log = JSON.parse(log)

        if ('submit' !== log.action) continue

        let boxName = `box${log.box}`, profName = ans.replace(/\.log/, '')
        let box = answer[boxName] ? answer[boxName] : answer[boxName] = {}
        let prof = box[profName] ? box[profName] : box[profName] = {}
        let paper = prof[log.pmid] ? prof[log.pmid] : prof[log.pmid] = {}
        paper[log.stcid] = {
          event   : log.event,
          protein : log.protein
        }
      }
    }

    fs.writeFileSync(`${opt.resPath}/answer.json`, JSON.stringify(answer, null, 2))

    // parse log

    // parse world information

    for (let box of src.box) {
      world.box[box.substring(0, 1).toUpperCase() + box.substring(1)] = {}
    }

    fs.writeFileSync('../res/world.json', JSON.stringify(world, null, 2))
  })
})
