# crowdNER

> Using outlier detection and entity recognition to improve a crowdsourcing biocuration system

## Set environment

1. Go to the root of this repository

2. Create a file, `option.json`, for server options; the field for google could be referred to [edit-google-spreadsheet](https://www.npmjs.com/package/edit-google-spreadsheet) on npm

```json
{
  "server": {
    "host": "",
    "port": ""
  },
  "google": {
    "oauth2": {
      "client_id": "",
      "client_secret": "",
      "refresh_token": ""
    },
    "v1": {
      "spreadsheetId": "",
      "worksheetId": {
        "enroll": "",
        "stats": ""
      }
    }
  }
}
```

3. Create essential folders

```bash
$ mkdir -p theme/v1/res/verify/NER theme/v2/res theme/v2/src/mark-result
```

4. Install modules

```bash
$ npm i

# or

$ yarn
```

## Conduct analyses for _Markteria_

1. Go to the working directory

```bash
$ cd [root of this repository]/theme/v1/
```

2. Upload the biocuration results (players' logs in _Markteria_)

```bash
$ mkdir -p src/mark-result/expert src/mark-result/subject src/words tools

# replace the file name of each annotator's log with his own experiment ID (such as '_dirty')
# upload the log file to 'src/mark-result/expert/' directory if an annotator is expert; otherwise, to 'src/mark-result/subject/' directory
# upload the stop word list to 'src/words/stopWords.json'
# upload all the biocuration results of automatic bioNER tools to 'tools/[bioNER tool name]/predict.mia.json'
```

3. Create a soft link pointing to the article box in _Markteria_

```bash
$ ln -s [root of Markteria repository]/world/[world name, such as 'NER' or 'PPI']/res/box/ src/
```

4. Upload the preprocessed resources

```bash
$ mkdir -p res/words res/world/box

# upload the gold-standard answer for the articles to 'res/'
# each word in the articles was categorized, and the results were put into 'res/words/'
# each article was preprocessed, and the results as well as the information of annototors were put into 'res/world/'
```

5. Build the benchmark (sentences annotated by at least 3 amateur annotators)

```bash
$ cd bin/

# parse all the amateur annotators' biocuration results (without domain expert), the output is generated in '../res/mark-result.json'
$ ./ans -a parse-mark-result -b _dirty -b _tseng

# build benchmark, the output is generated in '../res/benchmark-stcs.json'
$ ./ans -a build-benchmark

# the corresponding options for 'ans'
# -----------------------------------
# Usage: lsc ans.ls
#   -a, --action=ARG      specify operation
#   -b, --blacklist=ARG+  push subject id in blacklist
#   -f, --minFreq=ARG     set minimum threshold of word frequency in each article to be extracted
#   -F, --fixedSupp       set for integrating results exactly satisfy the required support (default: more than minimum support)
#   -h, --help            show this help
#   -s, --toSpreadsheet   send verification results to google spreadsheet (default: `false`)
#   -t, --maxTops=ARG     set maximum amounts of top frequent words in each article to be extracted
#   -T, --theme=ARG       specify theme (default: `NER`)
```

6. Verify the biocuration results

- amateur and expert

```bash
# parse all the amateur and expert annotators' biocuration results
$ ./ans -a parse-mark-result

# verify the individual biocuration results on benchmark, the average performance would be shown on the command line
$ ./ans -a verify-benchmark

# verify the aggregated biocuration results on benchmark, the output is generated in '../res/verify/NER/verification.json'
$ ./ans -a verify
```

- amateur only

```bash
# parse all the amateur annotators' biocuration results
$ ./ans -a parse-mark-result -b _dirty -b _tseng

# verify the individual biocuration results on benchmark, the average performance would be shown on the command line
$ ./ans -a verify-benchmark

# verify the aggregated biocuration results on benchmark, the output is generated in '../res/verify/NER/verification.json'
$ ./ans -a verify -b _dirty -b _tseng
```

- automatic bioNER tools

```bash
# verify the biocuration results of 'GENIA_tagger' on benchmark
$ ./hybrid-tools -t GENIA_tagger -b

# verify the biocuration results of 'GNormPlus' on benchmark
$ ./hybrid-tools -t GNormPlus -b

# verify the biocuration results of 'NLProt' on benchmark
$ ./hybrid-tools -t NLProt -b

# verify the biocuration results of 'Neji' on benchmark
$ ./hybrid-tools -t Neji -b

# verify the biocuration results of 'Swiss_Prot' on benchmark
$ ./hybrid-tools -t Swiss_Prot -b

# the corresponding options for 'hybrid-tools'
# --------------------------------------------
# Usage: lsc hybrid-tools.ls
#   -b, --benchmark    verify words in benchmark sentences
#   -c, --minConf=ARG  specify the minimum confidence (default: 1)
#   -h, --help         show this help
#   -t, --tools=ARG+   specify automatic tools (default: GENIA_tagger, GNormPlus, NLProt, Neji, Swiss_Prot)
```

7. Compute the _priori-quality_

- amateur and expert

```bash
# parse all the amateur and expert annotators' biocuration results
$ ./ans -a parse-mark-result

# compute the personal priori-quality for all the amateur and expert annotators, the output is generated in '../res/verify/NER/labeler-score.json'
$ ./labeler-score

# the corresponding options for 'labeler-score'
# ---------------------------------------------
# Usage: lsc labeler-score.ls
#   -h, --help         show this help
#   -s, --minSupp=ARG  set minimum support of sentences (default: `4`)
#   -T, --theme=ARG    specify theme (default: `NER`)
```

- amateur only

```bash
# parse all the amateur annotators' biocuration results
$ ./ans -a parse-mark-result -b _dirty -b _tseng

# compute the personal priori-quality for all the amateur annotators, the output is generated in '../res/verify/NER/labeler-score.json'
$ ./labeler-score
```

8. Carry out the simulation

```bash
# simulate the biocuration behavior with parameters in './.sim.opt.ls', the output is generated in '../res/verify/NER/sim-verification.json'
$ ./sim -p 32

# simulate the quantity-quality pairs which achieve an expert biocuration level, the output is generated in '../res/verify/NER/quantity-quality.json'
$ node --max_old_space_size=8192 /usr/local/bin/lsc sim -p 32 -q

# the corresponding options for 'sim'
# -----------------------------------
# Usage: lsc sim.ls
#   -h, --help           show this help
#   -p, --processor=ARG  set numbers of processor (default: 4)
#   -q, --qqPlot         simulate for quantity-quality plot (default: `false`)
#   -t, --theme=ARG      specify theme (default: `NER`)
```

## Start the improved biocuration tool

1. Build corpus

```bash
# take the biocuration results of automatic bioNER tools as reference, the output is generated in '../res/verify/NER/hybrid-tools-rlt.json'
$ cd [root of this repository]/theme/v1/bin/
$ ./hybrid-tools -t GENIA_tagger -t GNormPlus -t NLProt -t Neji -t Swiss_Prot

# build corpus, the output is generated in '../res/db.json'
$ cd [root of this repository]/theme/v2/bin/
$ ./build-db
```

2. Start the server

```bash
$ cd [root of this repository]/

$ npm start

# or

$ yarn start

# the individual biocuration result would be generated in 'theme/v2/src/mark-result/'
```
