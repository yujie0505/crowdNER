require! <[fs]>

#### global variables (with default values)

opt =
  max-tops: 30
  min-freq: 5
  path: res: \../res src: \../src
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

#### utility

!function ERR then throw it

#######################################################################################

switch opt.action
| \build-ans

  # build answers for NER only; use option "parse" to get additional PPI answers

  gs-answer = if fs.exists-sync "#{opt.path.res}/gs-answer.json" then JSON.parse fs.read-file-sync "#{opt.path.res}/gs-answer.json" \utf-8 else box1: {}
  ignored-entity = "(#{JSON.parse fs.read-file-sync "#{opt.path.res}/words/ignored.json" \utf-8 .join \|})"

  for pmid in fs.readdir-sync "#{opt.path.res}/world/box"
    art = JSON.parse fs.read-file-sync "#{opt.path.res}/world/box/#pmid" \utf-8
    ans = gs-answer.box1[pmid] ?= {}

    for stc, stcid in art.word
      stc-ans = ans[stcid] ?= {}

      for word, wid in stc
        if word.match ignored-entity
          stc-ans[wid] = 0 # ignored words
        else if res.NER.named-entity.protein[word]
          stc-ans[wid] = 1 # protein
        else if not stc-ans[wid]
          stc-ans[wid] = -1 # normal words

  fs.write-file-sync "#{opt.path.res}/gs-answer.json" JSON.stringify gs-answer, null 2

| \build-pending-words
  return ERR 'Error input: amounts of top frequent words' if not (opt.max-tops = parseInt opt.max-tops)
  return ERR 'Error input: threshold of word frequency' if not (opt.min-freq = parseInt opt.min-freq)

  word-checked = JSON.parse JSON.stringify res.nor
  word-checked <<< res.NER.category
  Object.keys res.NER.named-entity .map !-> word-checked <<< res.NER.named-entity[it]
  Object.keys res.adm .map (field) !-> Object.keys res.adm[field] .map !-> word-checked <<< res.adm[field][it]
  words-freq = JSON.parse fs.read-file-sync "#{opt.path.res}/world/wordsFreq.json" \utf-8

  for pmid, words of words-freq.box1
    art = JSON.parse fs.read-file-sync "#{opt.path.res}/world/box/#pmid" \utf-8
    md-NER = "mia NER_#pmid\n===\n\n## #pmid\n"
    md-PPI = "mia PPI_#pmid\n===\n\n## #pmid\n"
    word-counts = 0

    for i til words.length

      # top unchecked words for NER

      if not word-checked[words[i].word] and words[i].frequency >= opt.min-freq and ++word-counts <= opt.max-tops
        md-NER += "\n### #{words[i].word} (frequency: #{words[i].frequency})\n\n"
        for stcid of words[i].stcid
          md-NER += '- [ ]'
          for w, wid in art.word[stcid]
            md-NER += if w is words[i].word then "<span style='background-color: pink;'>#w</span>" else w
            md-NER += art.nonword[stcid][wid]
          md-NER += " [stcid: #stcid]\n"

      # top entity pairs for PPI

      continue if not res.NER.named-entity.protein[words[i].word]

      for j from i + 1 til words.length
        continue if not res.NER.named-entity.protein[words[j].word]

        md-PPI += "\n### #{words[i].word}_#{words[j].word}\n\n"
        for stcid of words[i].stcid
          continue if not words[j].stcid[stcid]

          md-PPI += '- [ ]'
          for w, wid in art.word[stcid]
            md-PPI += if w is words[i].word or w is words[j].word then "<span style='background-color: pink;'>#w</span>" else w
            md-PPI += art.nonword[stcid][wid]
          md-PPI += " [stcid: #stcid]\n"

    fs.write-file-sync "#{opt.path.src}/words/pending/NER_#pmid.md" md-NER
    fs.write-file-sync "#{opt.path.src}/words/pending/PPI_#pmid.md" md-PPI

| \parse-checked-words
  gs-answer = if fs.exists-sync "#{opt.path.res}/gs-answer.json" then JSON.parse fs.read-file-sync "#{opt.path.res}/gs-answer.json" \utf-8 else box1: {}
  ignored-entity = "(#{JSON.parse fs.read-file-sync "#{opt.path.res}/words/ignored.json" \utf-8 .join \|})"

  for md in fs.readdir-sync "#{opt.path.src}/words/checked/"
    if /^NER/ is md
      for item in fs.read-file-sync "#{opt.path.src}/words/checked/#md" \utf-8 .match /###.*/g
        word = item.match /###\s(.+?)\s/ .1
        if /{(.+)}/ is item then (that.1 / ', ').map -> res.NER.named-entity[it][word] = true
        else                     res.nor[word] = true

    else if /^PPI/ is md
      md = fs.read-file-sync "#{opt.path.src}/words/checked/#md" \utf-8
      art = JSON.parse fs.read-file-sync "#{opt.path.res}/world/box/#{pmid = md.match /##\s(\d+)\n/ .1}" \utf-8
      ans = gs-answer.box1[pmid] ?= {}

      for stc in md.match /- \[[x\s]\].*\n/g
        stc-ans = ans[stcid = stc.match /\[stcid:\s(\d+)\]/ .1] ?= {}

        if stc.match /<span style='background-color: lightblue;'>.+?<\/span>/g
          event-wrds = "(#{that.map(-> it = it.match />(.+)</ .1.replace(/\s/g, \|)) * \|})"
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

| \sentence-resplit

  # resplit words for each article sentence with new regex rule

  special-char = JSON.parse fs.read-file-sync "#{opt.path.src}/words/specialChar.json" \utf-8
  stop-words = JSON.parse fs.read-file-sync "#{opt.path.src}/words/stopWords.json" \utf-8
  words = box1: {}

  for pmid in fs.readdir-sync "#{opt.path.src}/box/box1" .filter(-> /^\d+$/ is it)
    refined-art = (JSON.parse JSON.stringify (art = JSON.parse fs.read-file-sync "#{opt.path.src}/box/box1/#pmid" \utf-8)) <<< nonword: [] word: []
    art-words = {}

    for stc, stcid in art.context
      if stc.match /(&#x[\da-f]{5};)/g
        checked-symbols = {}

        for symbol in that
          continue if checked-symbols[symbol]

          stc = stc.replace new RegExp(symbol, \g), special-char[symbol].character
          checked-symbols[symbol] = true

      refined-art.nonword[stcid] = []
      refined-art.word[stcid] = []

      for w, wid in stc.split /(&thinsp;|\s[-–]\s|[^\wαβγµáéκμνσΔ°–−-]+)/ .slice 0 -1
        if wid % 2
          refined-art.nonword[stcid].push w
        else
          refined-art.word[stcid].push w
          continue if stop-words[w]

          word = art-words[w] ?= frequency: 0 stcid: {}
          word.frequency++
          word.stcid[stcid] = true
    words.box1[pmid] = [{word: ..} <<< art-words[..] for Object.keys(art-words).sort (a, b) -> art-words[b].frequency - art-words[a].frequency]

    fs.write-file-sync "#{opt.path.res}/world/box/#pmid" JSON.stringify refined-art, null 2

  fs.write-file-sync "#{opt.path.res}/world/wordsFreq.json" JSON.stringify words, null 2

| _ then ERR 'No corresponding operation'
