const { ipcRenderer } = require('electron');
const path = require('path');

const updateHeritageDataBtn = document.getElementById('update-heritage-data');

updateHeritageDataBtn.addEventListener('click', function(event) {
  ipcRenderer.send('update-heritage-data');
});

const downloadHeritageDataBtn = document.getElementById('download-heritage-data');

downloadHeritageDataBtn.addEventListener('click', function(event) {
  var savePath = {
    photoPath: document.getElementById('photo-path').value,
    musicPath: document.getElementById('music-path').value
  };

  ipcRenderer.send('download-heritage-data', savePath);
});

const setPhotoPathBtn = document.getElementById('set-photo-path');

setPhotoPathBtn.addEventListener('click', function(event) {
  console.log('setPhotoPathBtn triggered');
  ipcRenderer.send('open-save-dialog', 'photo-path');
});

const setMusicPathBtn = document.getElementById('set-music-path');

setMusicPathBtn.addEventListener('click', function(event) {
  ipcRenderer.send('open-save-dialog', 'music-path');
});

ipcRenderer.on('set-save-path', function(event, arg) {
  if (arg.path) {
    document.getElementById(arg.id).value = arg.path;
  }
});
