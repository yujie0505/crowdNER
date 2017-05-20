require! <[fs]>

#### global variables (with default values)

opt =
  min-freq: 5
  path:
    res: \../res
    src: \../src
  top-word: 30
<<< require \node-getopt .create [
  * [\a , \action=ARG  , 'specify operation (eg. parse or top)']
  * [\f , \minFreq=ARG , 'set threshold of frequency of each word appearing in each article']
  * [\h , \help        , 'show this help']
  * [\t , \topWord=ARG , 'set amount of top frequent words in each article to be extracted']
  * [\w , \world=ARG   , 'specify world (eg. NER or PPI)']
] .bind-help '\nUsage: lsc word.ls\n[[OPTIONS]]\n' .parse-system!options

res =
  adm: JSON.parse fs.read-file-sync "#{opt.path.res}/words/academicWords.json" \utf-8
  NER: JSON.parse fs.read-file-sync "#{opt.path.res}/words/bioEntity.json" \utf-8
  nor: JSON.parse fs.read-file-sync "#{opt.path.res}/words/normalWord.json" \utf-8
  wrd: JSON.parse fs.read-file-sync "#{opt.path.res}/world/wordsFreq.json" \utf-8

#### utility

!function ERR => throw it

!function get-word-checked w, k, v
  return w[k] = true if true is v
  for _k, _v of v => get-word-checked w, _k, _v

!function sort a, b => a.to-lower-case!locale-compare b.to-lower-case!

#######################################################################################

switch opt.action
| \parse
  switch opt.world
  | \NER
    _NER = {}; Object.keys res.NER.named-entity .map -> _NER[it] = Object.keys res.NER.named-entity[it]
    _nor = Object.keys res.nor

    for words-checked in fs.readdir-sync "#{opt.path.res}/words/checked" .filter(-> /^NER/ is it)
      for item in fs.read-file-sync "#{opt.path.res}/words/checked/#words-checked" \utf-8 .match /###.*/g
        id = item.match /###\s(.+?)\s/ .1

        if /{(.+)}/ is item => (that.1 / ', ').map -> _NER[it].push id
        else                   _nor.push id

    for category, entities of _NER
      res.NER.named-entity[category] = {}
      entities.sort sort .map -> res.NER.named-entity[category][it] = true

    res.nor = {}; _nor.sort sort .map -> res.nor[it] = true

    fs.write-file-sync "#{opt.path.res}/words/bioEntity.json" JSON.stringify res.NER, null 2
    fs.write-file-sync "#{opt.path.res}/words/normalWord.json" JSON.stringify res.nor, null 2

  | \PPI
    arts = {}; gs-answer = {}; pmid = null
    ignored-regex = "(#{Object.keys(JSON.parse fs.read-file-sync "#{opt.path.res}/words/ignored.json" \utf-8).join \|})"

    for stc-checked in fs.readdir-sync "#{opt.path.res}/words/checked" .filter(-> /^PPI/ is it)
      stc-checked = fs.read-file-sync "#{opt.path.res}/words/checked/#stc-checked" \utf-8
      arts[pmid = that.1] = JSON.parse fs.read-file-sync "./build-ans/parse/box/#pmid" if stc-checked.match /##\s(\d+)\n/
      ans = gs-answer[pmid] ?= {}

      for stc in stc-checked.match /- \[[x\s]\].*\n/g
        ans-stc = ans[stcid = stc.match /\[stcid:\s(\d+)\]/ .1] ?= {}

        if stc is /<span style='background-color: lightblue;'>(.*?)<\/span>/
          event-wrds = "(#{stc.match(/<span style='background-color: lightblue;'>(.*?)<\/span>/g).map(-> it = ((it - /<\/?.*?>/g) / ' ').join \|).join \|})"
        else
          event-wrds = ''

        for word, wid in arts[pmid].word[stcid]
          if word.match ignored-regex
            ans-stc[wid] = 0 # ignored words
          else if res.NER.named-entity.protein[word]
            ans-stc[wid] = 1 # protein
          else if event-wrds isnt '' and word.match event-wrds
            ans-stc[wid] = 2 # event
          else if not ans-stc[wid]
            ans-stc[wid] = -1 # normal words

    fs.write-file-sync "#{opt.path.res}/gs-answer.json" JSON.stringify gs-answer, null 2

  | _ => ERR 'No corresponding input'

| \top
  | \NER
    if not      (opt.min-freq = parseInt opt.min-freq) => ERR 'Error input: minimum frequency'
    else if not (opt.top-word = parseInt opt.top-word) => ERR 'Error input: amount of top words'

    word-checked = {}; <[adm NER nor]>.map -> get-word-checked word-checked, null, res[it]

    md = 'mia NER\n===\n'
    for pmid, words of res.wrd.box1
      art = JSON.parse fs.read-file-sync "#{opt.path.src}/box/box1/#pmid" \utf-8
      word-counts = 0

      md += "\n## #pmid\n"
      for word in words
        continue if word-checked[word.word] or word.frequency < opt.min-freq

        md += "\n### #{word.word} (frequency: #{word.frequency})\n\n"
        for stcid of word.stcid
          md += '- [ ]'
          for w, wid in art.word[stcid]
            if w is word.word =>  md += "<span style='background-color: pink;'>#w</span>"
            else                  md += w
            md += art.nonword[stcid][wid]
          md += " [stcid: #stcid]\n"
        break if ++word-counts > opt.top-word

    fs.write-file-sync "#{opt.path.res}/words/pending/NER.md" md

  | \PPI
    md = 'mia PPI\n===\n'
    for pmid, words of res.wrd.box1
      art = JSON.parse fs.read-file-sync "#{opt.path.src}/box/box1/#pmid" \utf-8

      md += "\n## #pmid\n"
      for i from 0 til words.length
        continue if not res.NER.named-entity.protein[words[i].word]

        for j from i + 1 til words.length
          continue if not res.NER.named-entity.protein[words[j].word]

          md += "\n### #{words[i].word}_#{words[j].word}\n\n"
          for stcid of words[i].stcid
            continue if not words[j].stcid[stcid]

            md += '- [ ]'
            for w, wid in art.word[stcid]
              if w is words[i].word or w is words[j].word => md += "<span style='background-color: pink;'>#w</span>"
              else                                           md += w
              md += art.nonword[stcid][wid]
            md += " [stcid: #stcid]\n"

    fs.write-file-sync "#{opt.path.res}/words/pending/PPI.md" md

  | _ => ERR 'No corresponding input'
