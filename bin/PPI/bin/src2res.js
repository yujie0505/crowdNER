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

// utility

const parseLog = ($src, res) => {
  for (let srcID of src[$src]) {
    for (let log of fs.readFileSync(`${opt.srcPath}/${$src}/${srcID}/log`, 'utf-8').split('\n').slice(0, -1)) {
      log = JSON.parse(log)

      if ('submit' !== log.action) continue

      let boxName = `box${log.box}`
      let box = res[boxName] ? res[boxName] : res[boxName] = {}
      let labeler = box[srcID] ? box[srcID] : box[srcID] = {}
      let paper = labeler[log.pmid] ? labeler[log.pmid] : labeler[log.pmid] = {}
      paper[log.stcid] = {
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
const result = {}
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

    // parse answer logs

    parseLog('ans', answer)
    fs.writeFileSync(`${opt.resPath}/answer.json`, JSON.stringify(answer, null, 2))

    // parse experiment logs

    parseLog('exp', result)
    fs.writeFileSync(`${opt.resPath}/result.json`, JSON.stringify(result, null, 2))

    // parse world information

    for (let box of src.box) {
      world.box[box.substring(0, 1).toUpperCase() + box.substring(1)] = {}
    }
    fs.writeFileSync('../res/world.json', JSON.stringify(world, null, 2))
  })
})
