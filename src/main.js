const {app, BrowserWindow, ipcMain} = require('electron')
const fs = require('fs-extra')
var convertToWav = require('./video-to-audio')
let mainWindow
let pickerDialog

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    height: 500,
    width: 600
  });

  pickerDialog = new BrowserWindow({
    parent: mainWindow,
    skipTaskbar: true,
    modal: true,
    show: false,
    height: 390,
    width: 680
  })
  mainWindow.loadURL('file://' + __dirname + '/index.html')
  pickerDialog.loadURL('file://' + __dirname + '/picker.html')
});

ipcMain.on('show-picker', (event, options) => {
  pickerDialog.show()
  pickerDialog.webContents.send('get-sources', options)
})

ipcMain.on('source-id-selected', (event, sourceId) => {
  pickerDialog.hide()
  mainWindow.webContents.send('source-id-selected', sourceId)
})

ipcMain.on('SAVE_FILE', (event, path, buffer) => {
  fs.outputFile(path, buffer, err => {    
      if (err) {
          event.sender.send('ERROR', err.message)
      } else {          
          convertToWav(path, path + "tmp.wav", function(res){

          });
          event.sender.send('SAVED_FILE', path)          
      }
  })
})