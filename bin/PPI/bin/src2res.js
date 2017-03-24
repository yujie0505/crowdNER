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

    // parse world information

    const src = {
      ans     : fs.readdirSync(`${opt.srcPath}/ans/`),
      box     : fs.readdirSync(`${opt.srcPath}/box/`).filter(it => it.match(/^box\d+$/)),
      log     : fs.readdirSync(`${opt.srcPath}/log/`),
      ppiPair : fs.readFileSync(`${opt.srcPath}/PINDB.tab.txt`, 'utf-8').split('\n').slice(1, -1)
    }

    fs.writeFileSync('../res/world.json', JSON.stringify(world, null, 2))
  })
})
