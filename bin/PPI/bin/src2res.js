const fs = require('fs')
const google = require('edit-google-spreadsheet')

const opt = {
  debug  : true,
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
  art : {},
  box : fs.readdirSync(`${opt.srcPath}/box/`).filter(it => it.match(/^box\d+$/))
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

    const subject = {}
    let col = opt.worksheetCol.enroll
    for (let i in rows) {
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
    fs.writeFileSync(`${opt.resPath}/world/subject.json`, JSON.stringify(subject, null, 2))

    // parse world information

    const stcValue = {}, world = Object.assign({}, opt.world, { box: {} })
    for (let boxName of src.box) {
      let box = world.box[`${boxName.slice(0, 1).toUpperCase()}${boxName.slice(1, -1)} ${boxName.slice(-1)}`] = { articles: {} }
      src.art[boxName] = {}

      for (let pmid of fs.readdirSync(`${opt.srcPath}/box/${boxName}`).filter(it => it.match(/\d+/))) {
        src.art[boxName][pmid] = JSON.parse(fs.readFileSync(`${opt.srcPath}/box/${boxName}/${pmid}`, 'utf-8'))
        box.articles[pmid] = src.art[boxName][pmid].title
      }

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
        articles : Object.keys(box.articles).length,
        stcValue : {
          '0' : boxStack[0].length,
          '1' : boxStack[1].length,
          '2' : boxStack[2].length
        },
        updateTime : new Date().toISOString().slice(0, 10).replace(/-/g, '.')
      }
    }
    fs.writeFileSync(`${opt.resPath}/world/world.json`, JSON.stringify(world, null, 2))
    fs.writeFileSync(`${opt.resPath}/world/stcValue.json`, JSON.stringify(stcValue, null, 2))
  })
})
