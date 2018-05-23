const fs = require('fs');
const path = require('path');
const { app, BrowserWindow } = require('electron');
const download = require('download');
const event = require('./events.js');
const async = require('async');

let heritageData;
let config;

const heritage_data_js_url = 'https://www.sony.net/united/clock/assets/js/heritage_data.js';
const heritage_data_js_file = `${app.getAppPath()}/heritage_data.js`;
const config_file = `${app.getAppPath()}/config.json`;

function downloadFile(url, location, options, callback) {
  event.trigger('send-status', `Downloading from ${url} to ${location} ... `);
  options.useElectron = true;
  download(url, location, options).on('error', (error, body, response) => {
    throw error;
  }) .then(() => {
    event.trigger('send-status', "Complete.\n");
    callback(url, location);
  });
}

function updateHeritageData() {
  event.trigger('send-status', "Updating Heritage from offical website...\n");
  downloadFile(heritage_data_js_url, path.dirname(heritage_data_js_file), {}, (url, location) => {
    fs.appendFile(heritage_data_js_file, '\nexports.data = a_clock_heritage_data;\n', (err) => {
      if (err) throw err;
      heritageData = require(heritage_data_js_file).data;
    });
    event.trigger('send-status', "Heritage data updated.\n");
  });
}

exports.updateHeritageData = updateHeritageData;

function initHeritageData() {
  fs.stat('./heritage_data.js', (err, stats) => {
    if (!err) {
      event.trigger('send-status', `Heritage data was last updated on  ${stats.ctime.toDateString()}.\n`);
      heritageData = require(heritage_data_js_file).data;
      return;
    }
    if (err.code === 'ENOENT') {
      updateHeritageData();
      return;
    } else {
      throw (err);
    }
  });
}

function initConfig() {
  fs.open(config_file, 'wx', (err, fd) => {
    if (err) {
      if (err.code === 'EEXIST') {
        initSavePath();
      } else {
        throw err;
      }
    } else {

      var config = {
        photoPath: path.join(app.getPath('pictures'), 'Sony Global')
      };
      config.musicPath = path.join(config.photoPath, 'Theme Song of World Heritage');

      fs.write(fd, JSON.stringify(config, null, 4), () => {
        fs.close(fd, () => {
          initSavePath();
          console.log("No config file detected, using the default config.");
        });
      });
    }
  });
}

function initSavePath() {
  const config = require(config_file);
  event.trigger('load-config', config);
}

exports.initApp = function () {
  initHeritageData();
  initConfig();
};

const mkdir = (dir, callback) => {
  fs.mkdir(dir, (err) => {
    if (!err || err.code === 'EEXIST') {
      event.trigger('send-status', `Folder created or already exists: ${dir}.\n`);
      callback(null, dir);
    } else {
      console.log(dir);
      callback(err, null);
    }
  });
};

const fp_filename    = (id, num) => `${id}_3840_2160_fp_${num}`;
const ss_filename    = (id, num) => `${id}_3840_2160_ss_${num}`;
const sound_filename = (addr) => path.basename(addr);
const music_filename = (id) => 'theme_song_of_world_heritage_' + id + '.mp3';
const fp_address     = (id, num) => `http://di.update.sony.net/ACLK/wallpaper/${id}/3840_2160/fp/${fp_filename(id, num)}.zip`;
const ss_address     = (id, num) => `http://di.update.sony.net/ACLK/wallpaper/${id}/3840_2160/ss/${ss_filename(id, num)}.zip`;
const sound_address  = (addr) => (`http://hq.update.sony.net.edgesuite.net/${addr}`);
const music_address  = (id) => `https://www.sony.net/united/clock/assets/sound/${music_filename(id)}`;

function downloadHeritageData(savePath) {

  event.trigger('send-status', "Start downloading latest heritage data.\n");

  async.autoInject({
    createPhotoFolder: (callback) => mkdir(savePath.photoPath, callback),
    createMusicFolder: (callback) => mkdir(savePath.musicPath, callback),
    downloadSeries: [
      'createPhotoFolder', 'createMusicFolder', (photoPath, musicPath, seriesCallback) => {
        console.log(savePath.photoPath);
        console.log(photoPath);
        async.eachSeries(heritageData, function(heritage, heritageCallback) {
          let heritageName = heritage.id[0].toUpperCase() + heritage.id.substr(1);
          let heritagePath = path.join(photoPath, heritageName);

          async.autoInject({
            createHeritageFolder: (callback) => mkdir(heritagePath, callback),
            openHeritageJson: [
              'createHeritageFolder', (dir, callback) =>
                fs.open(path.join(heritagePath, `${heritageName}.json`), 'wx', (err, fd) => {
                  if(!err || err.code === 'EEXIST') {
                    callback(null, fd);
                  } else {
                    callback(err, null);
                  }
                })
            ],
            writeHeritageJson: [
              'openHeritageJson', (fd, callback) => {
                if(fd) {
                  event.trigger('send-status', `Writing JSON file: ${heritageName}.json\n`);
                  fs.write(fd, JSON.stringify(heritage, null, 4), (err) => {
                    if(err) {
                      callback(err);
                    }
                    fs.close(fd, callback);
                  });
                } else {
                  callback(null);
                }
              }
            ],
            createFpFolder: [
              'createHeritageFolder', (dir, callback) => {
                let fp_folderPath = path.join(heritagePath, `${heritageName}_fp`);
                mkdir(fp_folderPath, callback);
              }
            ],
            downloadFp: [
              'createFpFolder', (fpPath, callback) =>
                // Download fp photos
                async.eachOfSeries(heritage.fp , function(value, num, numCallback) {
                  if (!isNaN(parseInt(num))) {
                    fs.access(path.join(fpPath, fp_filename(heritage.id, num) + '.jpg'), (notexist) => {
                      if (notexist) {
                        downloadFile(fp_address(heritage.id, num), fpPath, {extract: true}, (url, location) => {
                          numCallback(null);
                        });
                      } else {
                        // event.trigger('send-status', 'File already exists.\n');
                        numCallback(null);
                      }
                    });
                  } else {
                    numCallback(null);
                  }
                }, callback)
            ],
            createSsFolder: [
              'downloadFp', (flag, callback) => {
                // Download ss photos
                var ss_folderPath = path.join(heritagePath, `${heritageName}_ss`);
                mkdir(ss_folderPath, callback);
              }
            ],
            downloadSs: [
              'createSsFolder', (ssPath, callback) => 
                async.eachSeries(heritage.ex, function (ss, numCallback) {
                  if (!isNaN(parseInt(ss.num))) {
                    fs.access(path.join(ssPath, ss_filename(heritage.id, ss.num) + '.jpg'), (notexist) => {
                      if (notexist) {
                        downloadFile(ss_address(heritage.id, ss.num), ssPath, {extract: true}, (url, location) => {
                          numCallback(null);
                        });
                      } else {
                        // event.trigger('send-status', 'File already exists.\n');
                        numCallback(null);
                      }
                    });
                  } else {
                    numCallback(null);
                  }
                }, callback)
            ],
            downloadSound: [
              'downloadSs', (flag, callback) => {
                // Download soundscape
                if (heritage.soundscape !== null) {
                  fs.access(path.join(heritagePath, sound_filename(heritage.soundscape.media.mp3)), (notexist) => {
                    if (notexist) {
                      downloadFile(sound_address(heritage.soundscape.media.mp3), heritagePath, {}, (url,location) => {
                        callback(null);
                      });
                    } else {
                      // event.trigger('send-status', 'File already exists.\n');
                      callback(null);
                    }
                  });
                } else {
                  callback(null);
                }
              }],
            downloadMusic: [
              'downloadSound', (flag, callback) => {
                // Download theme song
                if (!isNaN(parseInt(heritage.music))) {
                  fs.access(path.join(savePath.musicPath, music_filename(heritage.music)), (notexist) => {
                    if (notexist) {
                      downloadFile(music_address(heritage.music), savePath.musicPath, {}, (url, location) => {
                        callback(null);
                      });
                    } else {
                      // event.trigger('send-status', 'File already exists.\n');
                      callback(null);
                    }
                  });
                } else {
                  callback(null);
                }
              }]
          }, (callback) => {
            event.trigger('send-status', `${heritageName} download completed. \n`);
            heritageCallback(null);
          });
        }, (err, results) => {
          if(err) {
            throw(err);
          } else {
            event.trigger('send-status', `All download completed. \n`);
          }
        });
      }
    ]
  }, (err, results) => {
    console.log(err);
  });
}

exports.downloadHeritageData = downloadHeritageData;
