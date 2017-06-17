require! <[edit-google-spreadsheet fs]>

#### global variables (with default values)

opt =
  code: event: 2 ignored: 0 normal: -1 protein: 1
  debug: true
  google: JSON.parse fs.read-file-sync \../../../option.json \utf-8 .google
  path: res: \../res src: \../src
  sim-volume: 100
<<< require \node-getopt .create [
  * [\a , \action=ARG , 'specify operation, which is "build-data" or "verify"']
  * [\h , \help       , 'show this help']
] .bind-help '\nUsage: lsc sim.ls\n[[OPTIONS]]\n' .parse-system!options

gs-answer = JSON.parse fs.read-file-sync "#{opt.path.res}/gs-answer.json" \utf-8

#### utility

function choose-weighted
  choice-pool = []
  for choice, weight of it
    for til weight
      choice-pool.push choice
  -> choice-pool[Math.floor Math.random! * choice-pool.length]

!function ERR then throw it

!function shuffle
  for i from it.length til 0 by -1
    t = it[i - 1]
    it[i - 1] = it[j = Math.floor Math.random! * i]
    it[j] = t

!function verify ans, mark-rlt, verify-rlt
  for pmid, stcs of mark-rlt
    for stcid, stc of stcs
      verify-rlt.submits++

      for wid, label of ans[pmid][stcid]
        if      opt.code.ignored is label then continue
        else if opt.code.protein is label then verify-rlt[if stc.protein[wid] then \tp else \fn]++
        else if opt.code.event   is label then verify-rlt[if stc.event[wid] then \tp else \fn]++
        else verify-rlt[if stc.protein[wid] or stc.event[wid] then \fp else \tn]++

#######################################################################################

switch opt.action
| \build-data
  _stc-stack = JSON.parse fs.read-file-sync "#{opt.path.src}/box/box1/stack" \utf-8

  mark-result = box1: subject: {}
  stc-value = choose-weighted 0: 1 1: 3 2: 6
  for sim-id til opt.sim-volume
    rlt = mark-result.box1.subject["_sim_#sim-id"] = {}
    prob-tp = choose-weighted 0: 44 1: 56 #! need to be value of normal distribution
    prob-tn = choose-weighted 0: 5  1: 95 #! need to be value of normal distribution

    stc-stack = JSON.parse JSON.stringify _stc-stack
    for , stcs of stc-stack then shuffle stcs
    for til 100 #! number of sentences; need to be random value
      [pmid, stcid] = stc-stack[stc-value!].pop!
      art = rlt[pmid] ?= {}
      stc = art[stcid] ?= event: {} protein: {}

      for wid, label of gs-answer.box1[pmid][stcid]
        if      opt.code.event   is label and \1 is prob-tp! then stc.event[wid] = true
        else if opt.code.protein is label and \1 is prob-tp! then stc.protein[wid] = true
        else if opt.code.normal  is label and \0 is prob-tn! then stc.event[wid] = true

  fs.write-file-sync "#{opt.path.res}/sim-result.json" JSON.stringify mark-result, null 2

| \verify

  # compare mark-result with gs-answer and show statistic data on google spreadsheet

  mark-result = JSON.parse fs.read-file-sync "#{opt.path.res}/sim-result.json" \utf-8
  stc-value = JSON.parse fs.read-file-sync "#{opt.path.res}/world/stcValue.json" \utf-8

  app =
    col-id: sim-id: 1 submits: 5 tp: 6 fp: 7 fn: 8 tn: 9 accuracy: 10 recall: 11 precision: 12 f-score: 13
    max-considered-conf: 0.8 max-considered-supp: 15 row-id: 6 separated-rows-between-blocks: 3
  stats = {}

  (err, sheet) <-! edit-google-spreadsheet.load {opt.debug} <<< oauth2: opt.google.oauth2, spreadsheet-id: opt.google.spreadsheet-id, worksheet-id: opt.google.worksheet.sim
  return ERR 'Failed as loading to google spreadsheet' if err

  # verification of individual sim result

  for sim-id of mark-result.box1.subject
    verify gs-answer.box1, mark-result.box1.subject[sim-id], rlt = submits: 0 tp: 0 fp: 0 fn: 0 tn: 0
    acc = (rlt.tp + rlt.tn) / (rlt.tp + rlt.fp + rlt.fn + rlt.tn)
    pre = rlt.tp / (rlt.tp + rlt.fp)
    rec = rlt.tp / (rlt.tp + rlt.fn)

    stats[app.row-id++] =
      "#{app.col-id.sim-id}"    : sim-id
      "#{app.col-id.submits}"   : rlt.submits
      "#{app.col-id.tp}"        : rlt.tp
      "#{app.col-id.fp}"        : rlt.fp
      "#{app.col-id.fn}"        : rlt.fn
      "#{app.col-id.tn}"        : rlt.tn
      "#{app.col-id.accuracy}"  : acc
      "#{app.col-id.recall}"    : rec
      "#{app.col-id.precision}" : pre
      "#{app.col-id.f-score}"   : 2 * pre * rec / (pre + rec)

  app.row-id += app.separated-rows-between-blocks

  sheet.add stats; sheet.send !-> return ERR 'Failed as updating google spreadsheet' if it

| _ then ERR 'No corresponding operation'
