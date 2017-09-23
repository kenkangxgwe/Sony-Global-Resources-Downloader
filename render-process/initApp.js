const { ipcRenderer } = require('electron');

ipcRenderer.send('init-app');

ipcRenderer.on('load-config', function (event, arg) {
  const photoPath = document.getElementById('photo-path');
  const musicPath = document.getElementById('music-path');
  photoPath.value = arg.photoPath;
  musicPath.value = arg.musicPath;
})
