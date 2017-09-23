const {ipcRenderer} = require('electron');

const statusBar = document.getElementById('status-bar');

ipcRenderer.on('send-status', function (event, arg){
  statusBar.innerText += arg;
});
