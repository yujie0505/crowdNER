opt = code: event: 2 ignored: 0 normal: -1 protein: 1

!function integrate-PPI stc-labeled, min-conf-amount, rlt
  rlt <<< event: {} ignored: {} protein: {}

  for wid, labels of stc-labeled.labels
    labels-normal = stc-labeled.supp - labels.event - labels.protein

    if labels.event < min-conf-amount and labels.protein < min-conf-amount and labels-normal < min-conf-amount
      rlt.ignored[wid] = true
    else
      continue if labels-normal > labels.event and labels-normal > labels.protein

      if      labels.event   > labels.protein and labels.event   > labels-normal then rlt.event[wid] = true
      else if labels.protein > labels.event   and labels.protein > labels-normal then rlt.protein[wid] = true
      else                                                                            rlt.ignored[wid] = true

!function integrate-NER stc-labeled, min-conf-amount, rlt
  rlt <<< ignored: {} protein: {}

  for wid, labels of stc-labeled.labels
    labels-normal = stc-labeled.supp - labels.protein

    if labels.protein < min-conf-amount and labels-normal < min-conf-amount
      rlt.ignored[wid] = true
    else
      if      labels.protein >  labels-normal then rlt.protein[wid] = true
      else if labels.protein is labels-normal then rlt.ignored[wid] = true

!function verify-NER stc-labeled, wid, label, rlt
  switch label
  | opt.code.protein then rlt[if stc-labeled.protein[wid] then \tp else \fn]++
  | _                then rlt[if stc-labeled.protein[wid] then \fp else \tn]++

!function verify-PPI stc-labeled, wid, label, rlt
  switch label
  | opt.code.protein then rlt[if stc-labeled.protein[wid] then \tp else \fn]++
  | opt.code.event   then rlt[if stc-labeled.event[wid]   then \tp else \fn]++
  | _                then rlt[if stc-labeled.protein[wid] or stc-labeled.event[wid] then \fp else \tn]++

module.exports =
  integrate: (theme, stc-value, min-supp, min-conf, mark-rlts, statistics) ->
    integrate = if \NER is theme then integrate-NER else if \PPI is theme then integrate-PPI

    mark-rlt = {}
    for pmid, stcs of mark-rlts
      mark-rlt[pmid] = {}

      for stcid, stc of stcs
        continue if stc.supp < min-supp
        # continue if stc.supp isnt min-supp

        statistics.stc.total++
        statistics.stc["val_#{stc-value.box1[pmid][stcid]}"]++
        integrate stc, stc.supp * min-conf, mark-rlt[pmid][stcid] = {}

    mark-rlt

  verify: (theme, ans, mark-rlt, verify-rlt) !->
    verify = if \NER is theme then verify-NER else if \PPI is theme then verify-PPI

    for pmid, stcs of mark-rlt
      for stcid, stc of stcs
        verify-rlt.submits++

        for wid, label of ans[pmid][stcid]
          continue if stc.ignored and stc.ignored[wid] # for words cannot be confirmed via integrated result
          continue if opt.code.ignored is label # for words not taken into consideration

          verify stc, wid, label, verify-rlt
