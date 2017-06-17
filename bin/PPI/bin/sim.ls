require! <[fs]>

#### global variables (with default values)

opt =
  code: event: 2 ignored: 0 normal: -1 protein: 1
  debug: true
  google: JSON.parse fs.read-file-sync \../../../option.json \utf-8 .google
  path: res: \../res src: \../src
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

