opt = code: event: 2 ignored: 0 normal: -1 protein: 1

module.exports =
  integrate: (stc-value, min-supp, min-conf, mark-rlts, verify-rlt) ->
    mark-rlt = {}

    for pmid, stcs of mark-rlts
      mark-rlt[pmid] = {}

      for stcid, stc of stcs
        continue if stc.supp < min-supp

        verify-rlt.stc.total++
        verify-rlt.stc["val_#{stc-value.box1[pmid][stcid]}"]++

        amount-min-conf = stc.supp * min-conf
        mark-rlt[pmid][stcid] = event: {} protein: {} ignored: {}

        for wid, labels of stc.labels
          labels-normal = stc.supp - labels.event - labels.protein

          if labels.event < amount-min-conf and labels.protein < amount-min-conf and labels-normal < amount-min-conf
            mark-rlt[pmid][stcid].ignored[wid] = true
          else
            continue if labels-normal > labels.event and labels-normal > labels.protein

            if      labels.event   > labels.protein and labels.event   > labels-normal then mark-rlt[pmid][stcid].event[wid] = true
            else if labels.protein > labels.event   and labels.protein > labels-normal then mark-rlt[pmid][stcid].protein[wid] = true
            else                                                                            mark-rlt[pmid][stcid].ignored[wid] = true

    mark-rlt

  verify-NER: (ans, mark-rlt, verify-rlt) !->
    for pmid, stcs of mark-rlt
      for stcid, stc of stcs
        verify-rlt.submits++

        for wid, label of ans[pmid][stcid]
          continue if stc.ignored and stc.ignored[wid] # for words cannot be confirmed via integrated result

          if      opt.code.ignored is label then continue
          else if opt.code.protein is label then verify-rlt[if stc.protein[wid] then \tp else \fn]++
          else verify-rlt[if stc.protein[wid] then \fp else \tn]++

  verify-PPI: (ans, mark-rlt, verify-rlt) !->
    for pmid, stcs of mark-rlt
      for stcid, stc of stcs
        verify-rlt.submits++

        for wid, label of ans[pmid][stcid]
          continue if stc.ignored and stc.ignored[wid] # for words cannot be confirmed via integrated result

          if      opt.code.ignored is label then continue
          else if opt.code.protein is label then verify-rlt[if stc.protein[wid] then \tp else \fn]++
          else if opt.code.event   is label then verify-rlt[if stc.event[wid] then \tp else \fn]++
          else verify-rlt[if stc.protein[wid] or stc.event[wid] then \fp else \tn]++
