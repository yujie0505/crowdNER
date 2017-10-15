module.exports = {
  parseCsv: data => {
    return data.map(row => row.join(',')).join('\n')
  }
}
