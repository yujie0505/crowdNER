# crowdNER

> Using outlier detection and entity recognition to improve a crowdsourcing biocuration system

## Start the annotation tool

Create a file, `option.json`, for server options; the field for google could refer to [edit-google-spreadsheet](https://www.npmjs.com/package/edit-google-spreadsheet) on npm

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
