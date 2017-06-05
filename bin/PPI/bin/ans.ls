require! <[fs]>

#### global variables (with default values)

opt =
  max-tops: 30
  min-freq: 5
  path:
    res: \../res
    src: \../src
<<< require \node-getopt .create [
  * [\a , \action=ARG  , 'specify operation, which is "parse" or "top"']
  * [\f , \minFreq=ARG , 'set minimum threshold of word frequency in each article to be extracted']
  * [\h , \help        , 'show this help']
  * [\t , \maxTops=ARG , 'set maximum amounts of top frequent words in each article to be extracted']
] .bind-help '\nUsage: lsc ans.ls\n[[OPTIONS]]\n' .parse-system!options

res =
  adm: JSON.parse fs.read-file-sync "#{opt.path.res}/words/academicWords.json" \utf-8
  NER: JSON.parse fs.read-file-sync "#{opt.path.res}/words/bioEntity.json" \utf-8
  nor: JSON.parse fs.read-file-sync "#{opt.path.res}/words/normalWord.json" \utf-8
  wrd: JSON.parse fs.read-file-sync "#{opt.path.res}/world/wordsFreq.json" \utf-8

#### utility

!function ERR => throw it

#######################################################################################

switch opt.action
| \parse
  gs-answer = box1: {}; ignored-entity = "(#{JSON.parse fs.read-file-sync "#{opt.path.res}/words/ignored.json" \utf-8 .join \|})"

  for md in fs.readdir-sync "#{opt.path.src}/words/checked/"
    if /^NER/ is md
      for item in fs.read-file-sync "#{opt.path.src}/words/checked/#md" \utf-8 .match /###.*/g
        word = item.match /###\s(.+?)\s/ .1
        if /{(.+)}/ is item then (that.1 / ', ').map -> res.NER.named-entity[it][word] = true
        else                     res.nor[word] = true

    else if /^PPI/ is md
      md = fs.read-file-sync "#{opt.path.src}/words/checked/#md" \utf-8
      art = JSON.parse fs.read-file-sync "#{opt.path.res}/world/box/#{pmid = md.match /##\s(\d+)\n/ .1}" \utf-8
      gs-answer.box1[pmid] = {}

      for stc in md.match /- \[[x\s]\].*\n/g
        stc-ans = gs-answer.box1[pmid][stcid = stc.match /\[stcid:\s(\d+)\]/ .1] ?= {}

        if stc.match /<span style='background-color: lightblue;'>.+?<\/span>/g
          event-wrds = "(#{that.map(-> it = it.match />(.+)</ .1.replace(' ', \|)) * \|})"
        else
          event-wrds = ''

        for word, wid in art.word[stcid]
          if word.match ignored-entity
            stc-ans[wid] = 0 # ignored words
          else if res.NER.named-entity.protein[word]
            stc-ans[wid] = 1 # protein
          else if word.match event-wrds
            stc-ans[wid] = 2 # event
          else if not stc-ans[wid]
            stc-ans[wid] = -1 # normal words

  fs.write-file-sync "#{opt.path.res}/words/bioEntity.json" JSON.stringify res.NER, null 2
  fs.write-file-sync "#{opt.path.res}/words/normalWord.json" JSON.stringify res.nor, null 2
  fs.write-file-sync "#{opt.path.res}/gs-answer.json" JSON.stringify gs-answer, null 2

| _ => ERR 'No corresponding operation'
