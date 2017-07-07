require! <[edit-google-spreadsheet fs ../../../lib/crowd.ls ../../../lib/math.js]>

#### global variables (with default values)

opt =
  code: event: 2 ignored: 0 normal: -1 protein: 1
  column: sim-volume: 1 stc: total: 2 val_0: 3 val_1: 4 val_2: 5
  debug: true
  google: JSON.parse fs.read-file-sync \../../../option.json \utf-8 .google
  min-conf: [0.3 to 1 by 0.1]
  path: res: \../res src: \../src
  simulation:
    NER:
      FPR: mean: 0.0240 std-dev: 0.0140
      TPR: mean: 0.6696 std-dev: 0.2825
    PPI:
      FPR: mean: 0.0449 std-dev: 0.0233
      TPR: mean: 0.5616 std-dev: 0.2165
    volume: min: 1 max: 37 step: 2
  supp-required: 3
  theme: \NER
<<< require \node-getopt .create [
  * [\h , \help             , 'show this help']
  * [\s , \suppRequired=ARG , 'set the required support of labeled sentences by subjects (default: 3)']
  * [\T , \theme=ARG        , 'specify theme (default: `NER`)']
] .bind-help '\nUsage: lsc sim.ls\n[[OPTIONS]]\n' .parse-system!options

opt.supp-required = parseInt opt.supp-required

#### utility

!function ERR then throw it

!function shuffle
  for i from it.length til 0 by -1
    t = it[i - 1]
    it[i - 1] = it[j = Math.floor Math.random! * i]
    it[j] = t

#######################################################################################

gs-answer   = JSON.parse fs.read-file-sync "#{opt.path.res}/gs-answer.json" \utf-8
mark-result = JSON.parse fs.read-file-sync "#{opt.path.res}/mark-result.json" \utf-8
stc-value   = JSON.parse fs.read-file-sync "#{opt.path.res}/world/stcValue.json" \utf-8

stats = {}; row-id = 4
sim-result = subject: {} labeled-stc: {}

for sim-volume from opt.simulation.volume.min to opt.simulation.volume.max by opt.simulation.volume.step

  # build simulation data

  for sim-id from Object.keys(sim-result.subject).length til sim-volume
    rlt = sim-result.subject["_sim_#sim-id"] = {}

    FPR = opt.simulation[opt.theme].FPR.mean

    # while true then break if (TPR = math.generateGaussianSample opt.simulation[opt.theme].TPR.mean, opt.simulation[opt.theme].TPR.std-dev) < 1 and TPR > 0
    # TPR = opt.simulation[opt.theme].TPR.mean
    TPR = 0.6

    pick-fp = math.choose-weighted [0 1] [100 - (FPR = parseInt FPR * 100), FPR]
    pick-tp = math.choose-weighted [0 1] [100 - (TPR = parseInt TPR * 100), TPR]

    for pmid, stcs of gs-answer.box1
      rlt[pmid] = {}

      for stcid, stc of stcs
        sim-stc = rlt[pmid][stcid] = event: {} protein: {}

        sim-art-labeled = sim-result.labeled-stc[pmid] ?= {}
        sim-stc-labeled = sim-art-labeled[stcid] ?= labels: {} supp: 0
        sim-stc-labeled.supp++

        for wid, label of stc
          continue if opt.code.ignored is label

          if      opt.code.event   is label and pick-tp! then label-picked = \event
          else if opt.code.protein is label and pick-tp! then label-picked = \protein
          else if opt.code.normal  is label and pick-fp! then label-picked = \protein
          else continue

          sim-stc[label-picked][wid] = true

          sim-stc-labeled.labels[wid] ?= event: 0 protein: 0
          sim-stc-labeled.labels[wid][label-picked]++

  fs.write-file-sync "#{opt.path.res}/sim/volume_#sim-volume.json" JSON.stringify sim-result, null 2

  # verification of integrated sim-result

  col-id = 6
  for min-conf in opt.min-conf
    verify-rlt = submits: 0 tp: 0 fp: 0 fn: 0 tn: 0 stc: total: 0 val_0: 0 val_1: 0 val_2: 0
    mark-rlt = crowd.integrate-fixed opt.theme, stc-value, sim-volume, min-conf, sim-result.labeled-stc, verify-rlt

    crowd.verify opt.theme, gs-answer.box1, mark-rlt, verify-rlt
    verify-rlt.pre = verify-rlt.tp / (verify-rlt.tp + verify-rlt.fp)
    verify-rlt.rec = verify-rlt.tp / (verify-rlt.tp + verify-rlt.fn)
    verify-rlt.F-score = 2 * verify-rlt.pre * verify-rlt.rec / (verify-rlt.pre + verify-rlt.rec)

    for statistics, index in <[pre rec FScore]>
      stats[row-id + index * 30] ?=
        "#{opt.column.sim-volume}": sim-volume
        "#{opt.column.stc.total}" : verify-rlt.stc.total
        "#{opt.column.stc.val_0}" : verify-rlt.stc.val_0
        "#{opt.column.stc.val_1}" : verify-rlt.stc.val_1
        "#{opt.column.stc.val_2}" : verify-rlt.stc.val_2

      stats[row-id + index * 30][col-id] = verify-rlt[statistics]

    col-id++
  row-id++

(err, sheet) <-! edit-google-spreadsheet.load {opt.debug} <<< oauth2: opt.google.oauth2, spreadsheet-id: opt.google.spreadsheet-id, worksheet-id: opt.google.worksheet.sim
return ERR 'Failed as loading to google spreadsheet' if err

sheet.add stats; sheet.send !-> return ERR 'Failed as updating google spreadsheet' if it
