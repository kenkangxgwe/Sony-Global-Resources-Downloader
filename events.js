const { BrowserWindow, ipcMain, dialog } = require('electron');

const app = require('./app');
const mainWindow = require('./main').mainWindow;

ipcMain.on('init-app', (event) => {
  app.initApp();
});

ipcMain.on('update-heritage-data', (event) => {
  app.updateHeritageData();
});

ipcMain.on('download-heritage-data', (event, arg) => {
  app.downloadHeritageData(arg);
});

ipcMain.on('open-save-dialog', (event, arg) => {
  console.log('open-save-dialog received');
  dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory', 'promptToCreate']
  }, function (filePaths) {
    console.log(`the filePaths is ${filePaths}`);
    if (filePaths) {
      console.log('set-save-path sent');
      event.sender.send('set-save-path', {
        path: filePaths,
        id: arg
      });
    }
  });
});

function trigger (event, arg) {
  mainWindow.webContents.send(event, arg);
};

exports.trigger =  trigger;
