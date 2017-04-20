require! <[fs]>

#### global variables (with default values)

opt =
  min-freq: 5
  path:
    res: \../res
    src: \../src
  top-word: 30
<<< require \node-getopt .create [
  * [\f , \minFreq=ARG , 'set threshold of frequency of each word appearing in each article']
  * [\h , \help        , 'show this help']
  * [\t , \topWord=ARG , 'set amount of top frequent words in each article to be extracted']
  * [\T , \top=ARG     , 'extract frequent words in each article (NER or PPI)']
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

#######################################################################################

if opt.top
  switch opt.top
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

  | _ => ERR 'no corresponding word type'
