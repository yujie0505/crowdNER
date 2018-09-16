# crowdNER

> Using outlier detection and entity recognition to improve a crowdsourcing biocuration system

## Set environment

1. Go to the root of this repository

2. Create a file, `option.json`, for server options; the field for google could refer to [edit-google-spreadsheet](https://www.npmjs.com/package/edit-google-spreadsheet) on npm

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

## Conduct analysis for Markteria

1. Go to the working directory

```bash
$ cd theme/v1/
```

2. Upload the annotation results (players' logs in Markteria)

```bash
$ mkdir -p src/mark-result/expert src/mark-result/subject

# replace the file name of each annotator's log with his own experiment ID (such as '_dirty')
# upload the file to 'expert' directory if an annotator is expert; otherwise, to 'subject' directory
```

3. Upload the preprocessed resources

```bash
$ mkdir -p res/words res/world/box

# upload the gold-standard answer for the articles as 'res/gs-answer.json'
# each word in the articles was categorized, and the results were put into 'res/words'
# each article was preprocessed, and the results as well as the information of annototors were put into 'res/world'
```

4. Build resources

```bash
$ cd bin/

```
