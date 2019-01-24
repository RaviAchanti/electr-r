var record = require('node-record-lpcm16')
var fs = require('fs')
 
var file = fs.createWriteStream('test.wav', { encoding: 'binary' })
 
record.start().pipe(file)
 
setTimeout(function () {
  record.stop()
}, 10000);