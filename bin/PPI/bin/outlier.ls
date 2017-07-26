require! <[fs]>

#### global variables (with default values)

opt =
  min-supp: 3
  path: res: \../res src: \../src
  theme: \NER
<<< require \node-getopt .create [
  * [\h , \help        , 'show this help']
  * [\s , \minSupp=ARG , 'set minimum support of sentences']
  * [\T , \theme=ARG   , "specify theme (default: `#{opt.theme}`)"]
] .bind-help '\nUsage: lsc outlier.ls\n[[OPTIONS]]\n' .parse-system!options
opt.min-supp = parseInt opt.min-supp

res =
  rlt: JSON.parse fs.read-file-sync "#{opt.path.res}/mark-result.json" \utf-8
  sub: JSON.parse fs.read-file-sync "#{opt.path.res}/world/subject.json" \utf-8

#### utility

function label-amounts sub-rlt, integrated-rlt
  #! need to be discuss

  # difference of amounts of labeled result between independent subject and others

  total-labeled-protein-words = 0
  for , labels of integrated-rlt.labels
    total-labeled-protein-words++ if labels.protein > labels.event

  Object.keys(sub-rlt.protein).length - total-labeled-protein-words

function label-consistency sub-rlt, integrated-rlt

  # consistency of labeled result between independent subject and others

  _score = 0; words = {}

  for wid of sub-rlt.protein
    words[wid] = true
    _score += integrated-rlt.labels[wid].protein / integrated-rlt.supp

  for wid, labels of integrated-rlt.labels
    continue if words[wid] or not labels.protein

    words[wid] = true
    _score += (integrated-rlt.supp - labels.protein) / integrated-rlt.supp

  _score / Object.keys(words).length || 1

function labeler-stc-score
  label-consistency ...

#######################################################################################

rlt = outlier_score: [] subjects: []

for sid, info of res.sub.personal
  [labeler-score, num-submits] = [0] * 2

  for eid in info.expID
    for pmid, stcs of res.rlt.box1.subject[eid]
      for stcid, stc of stcs
        continue if opt.min-supp > res.rlt.box1.labeled-stc[pmid][stcid].supp

        labeler-score += labeler-stc-score stc, res.rlt.box1.labeled-stc[pmid][stcid]
        num-submits++

  rlt.subjects.push sid
  rlt.outlier_score.push labeler-score / num-submits

fs.write-file-sync "#{opt.path.res}/verify/#{opt.theme}/outlier.json" JSON.stringify rlt, null 2
