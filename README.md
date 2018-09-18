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
    "spreadsheetId": "",
    "worksheet": {
      "enroll": "",
      "stats": ""
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
$ mkdir -p src/mark-result/expert src/mark-result/subject

# replace the file name of each annotator's log with his own experiment ID (such as '_dirty')
# upload the log file to 'src/mark-result/expert/' directory if an annotator is expert; otherwise, to 'src/mark-result/subject/' directory
```

3. Create a soft link pointing to the article box in _Markteria_

```bash
ln -s [root of Markteria repository]/world/[world name, such as 'NER' or 'PPI']/res/box/ src/
```

4. Upload the preprocessed resources

```bash
$ mkdir -p res/words res/world/box

# upload the gold-standard answer for the articles to 'res/'
# each word in the articles was categorized, and the results were put into 'res/words/'
# each article was preprocessed, and the results as well as the information of annototors were put into 'res/world/'
```

5. Parse annotators' biocuration results

```bash
$ cd bin/

# parse all the amateur and expert biocuration results
./ans -a parse-mark-result

# parse all the amateur biocuration results (without expert)
./ans -a parse-mark-result -b _dirty -b _tseng
```
