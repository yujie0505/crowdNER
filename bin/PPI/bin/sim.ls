require! <[fs ../../../lib/crowd.ls ../../../lib/math.js]>

#### global variables (with default values)

opt =
  code: event: 2 ignored: 0 normal: -1 protein: 1
  color:
    cyan      : '\033[0;36m'
    dark-gray : '\033[1;30m'
    light-red : '\033[1;31m'
    reset     : '\033[0m'
    yellow    : '\033[1;33m'
  min-conf: [0.3 to 1 by 0.1]
  path: res: \../res src: \../src
  simulation:
    NER:
      * title: \0.50          TPR: { mean: 0.50   std-dev: 0 }      FPR: { mean: 0.0240 std-dev: 0.0137 }
      * title: \0.55          TPR: { mean: 0.55   std-dev: 0 }      FPR: { mean: 0.0240 std-dev: 0.0137 }
      * title: \0.60          TPR: { mean: 0.60   std-dev: 0 }      FPR: { mean: 0.0240 std-dev: 0.0137 }
      * title: \0.65          TPR: { mean: 0.65   std-dev: 0 }      FPR: { mean: 0.0240 std-dev: 0.0137 }
      * title: \0.70          TPR: { mean: 0.70   std-dev: 0 }      FPR: { mean: 0.0240 std-dev: 0.0137 }
      * title: \ori           TPR: { mean: 0.6696 std-dev: 0.2754 } FPR: { mean: 0.0240 std-dev: 0.0137 }
      * title: \removeOutlier TPR: { mean: 0.7005 std-dev: 0.2463 } FPR: { mean: 0.0240 std-dev: 0.0137 }
    PPI:
      * title: \0.50          TPR: { mean: 0.50   std-dev: 0 }      FPR: { mean: 0.0449 std-dev: 0.0227 }
      * title: \0.55          TPR: { mean: 0.55   std-dev: 0 }      FPR: { mean: 0.0449 std-dev: 0.0227 }
      * title: \0.60          TPR: { mean: 0.60   std-dev: 0 }      FPR: { mean: 0.0449 std-dev: 0.0227 }
      * title: \0.65          TPR: { mean: 0.65   std-dev: 0 }      FPR: { mean: 0.0449 std-dev: 0.0227 }
      * title: \0.70          TPR: { mean: 0.70   std-dev: 0 }      FPR: { mean: 0.0449 std-dev: 0.0227 }
      * title: \ori           TPR: { mean: 0.5616 std-dev: 0.2110 } FPR: { mean: 0.0449 std-dev: 0.0227 }
    repeated: 100
    volume: min: 1 max: 499 step: 2
  supp-required: 3
  theme: \NER
<<< require \node-getopt .create [
  * [\h , \help             , 'show this help']
  * [\s , \suppRequired=ARG , "set the required support for each labeled sentence (default: #{opt.supp-required})"]
  * [\T , \theme=ARG        , "specify theme (default: `#{opt.theme}`)"]
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

average-verify-rlt = {}
for sim-category in opt.simulation[opt.theme]

  if not fs.exists-sync "#{opt.path.res}/sim/#{opt.theme}/TPR_#{sim-category.title}"
    fs.mkdir-sync "#{opt.path.res}/sim/#{opt.theme}/TPR_#{sim-category.title}"

  average-verify-rlt["TPR_#{sim-category.title}"] = {}

  for sim-exp-id til opt.simulation.repeated
    sim-result = subject: {} labeled-stc: {} verification: {}

    for sim-volume from opt.simulation.volume.min to opt.simulation.volume.max by opt.simulation.volume.step

      # build simulation data

      for sim-sub-id from Object.keys(sim-result.subject).length til sim-volume
        rlt = sim-result.subject["_sim_#sim-sub-id"] = {}

        while true then break if (FPR = math.generateGaussianSample sim-category.FPR.mean, sim-category.FPR.std-dev) < 1 and FPR > 0
        while true then break if (TPR = math.generateGaussianSample sim-category.TPR.mean, sim-category.TPR.std-dev) < 1 and TPR > 0

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

      # verification of integrated sim-result

      sim-result.verification[sim-volume] = {}
      average-verify-rlt["TPR_#{sim-category.title}"][sim-volume] ?= {}
      for min-conf in opt.min-conf
        verify-rlt = submits: 0 tp: 0 fp: 0 fn: 0 tn: 0 stc: total: 0 val_0: 0 val_1: 0 val_2: 0
        mark-rlt = crowd.integrate-fixed opt.theme, stc-value, sim-volume, min-conf, sim-result.labeled-stc, verify-rlt

        crowd.verify opt.theme, gs-answer.box1, mark-rlt, verify-rlt
        verify-rlt.pre = verify-rlt.tp / (verify-rlt.tp + verify-rlt.fp)
        verify-rlt.rec = verify-rlt.tp / (verify-rlt.tp + verify-rlt.fn)
        verify-rlt.F-score = 2 * verify-rlt.pre * verify-rlt.rec / (verify-rlt.pre + verify-rlt.rec)

        sim-result.verification[sim-volume][(min-conf = min-conf.to-fixed 1)] = verify-rlt
        average-verify-rlt["TPR_#{sim-category.title}"][sim-volume][min-conf] ?= pre: 0 rec: 0 F-score: 0
        average-verify-rlt["TPR_#{sim-category.title}"][sim-volume][min-conf].pre += verify-rlt.pre
        average-verify-rlt["TPR_#{sim-category.title}"][sim-volume][min-conf].rec += verify-rlt.rec
        average-verify-rlt["TPR_#{sim-category.title}"][sim-volume][min-conf].F-score += verify-rlt.F-score

    console.log "[#{opt.color.dark-gray}#{(new Date!to-string! / ' ')[4]}#{opt.color.reset}] #{opt.color.yellow}Finished #{opt.color.cyan}TPR_#{sim-category.title} #{opt.color.light-red}#{sim-exp-id + 1}#{opt.color.reset}/#{opt.simulation.repeated}"

    fs.write-file-sync "#{opt.path.res}/sim/#{opt.theme}/TPR_#{sim-category.title}/sim_#sim-exp-id.json" JSON.stringify sim-result, null 2

  for , confs of average-verify-rlt["TPR_#{sim-category.title}"]
    for , verify-rlt of confs
      verify-rlt.pre /= opt.simulation.repeated
      verify-rlt.rec /= opt.simulation.repeated
      verify-rlt.F-score /= opt.simulation.repeated

fs.write-file-sync "#{opt.path.res}/verify/#{opt.theme}/sim-verification.json" JSON.stringify average-verify-rlt, null 2
