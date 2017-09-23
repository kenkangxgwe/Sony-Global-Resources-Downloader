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
    if (err.code == 'ENOENT') {
      updateHeritageData();
      return;
    } else {
      throw (err);
    }
  });
}

function initConfig() {
  fs.open('./config.json', 'wx', (err, fd) => {
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
  const config = require('./config.json');
  event.trigger('load-config', config);
}

exports.initApp = function () {
  initHeritageData();

  initConfig();
};

function downloadHeritageData(savePath) {

  event.trigger('send-status', "Start downloading latest heritage data.\n");

  const mkdir = (dir) => {
    fs.mkdir(dir, (err) => {
      if (err) {
        if (err.code === 'EEXIST') {
          // event.trigger('send-status', `Folder already exists: ${dir}\n`);
        } else {
          throw err;
        }
      } else {
        event.trigger('send-status', `Folder created: ${dir}.\n`);
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

  mkdir(savePath.photoPath);
  mkdir(savePath.musicPath);

  async.eachSeries(heritageData, function(heritage, dataCallback) {
    let folderName = heritage.id[0].toUpperCase() + heritage.id.substr(1);
    let folderPath = path.join(savePath.photoPath, folderName);

    mkdir(folderPath);

    fs.open(path.join(folderPath, `${folderName}.json`), 'wx', (err, fd) => {
      if (err) {
        if (err.code !== 'EEXIST') {
          event.trigger('send-status', 'Error!');
          throw err;
        }
      } else {
        event.trigger('send-status', `Writing JSON file: ${folderName}.json\n`);
        fs.write(fd, JSON.stringify(heritage, null, 4), () => {
          fs.close(fd, () => {});
        });
      }
    });

    async.series([
      (fpCallback) => {
        // Download fp photos
        var fp_folderPath = path.join(folderPath, `${folderName}_fp`);
        mkdir(fp_folderPath);

        async.eachOfSeries(heritage.fp , function(value, num, numCallback) {
          if (!isNaN(parseInt(num))) {
            fs.access(path.join(fp_folderPath, fp_filename(heritage.id, num) + '.jpg'), (notexist) => {
              if (notexist) {
                downloadFile(fp_address(heritage.id, num), fp_folderPath, {extract: true}, (url, location) => {
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
        }, fpCallback(null));
      },

      (ssCallback) => {
        // Download ss photos
        var ss_folderPath = path.join(folderPath, `${folderName}_ss`);
        mkdir(ss_folderPath);

        async.eachSeries(heritage.ex, function (ss, numCallback) {
          if (!isNaN(parseInt(ss.num))) {
            fs.access(path.join(ss_folderPath, ss_filename(heritage.id, ss.num) + '.jpg'), (notexist) => {
              if (notexist) {
                downloadFile(ss_address(heritage.id, ss.num), ss_folderPath, {extract: true}, (url, location) => {
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
        }, ssCallback(null));
      },

      (soundCallback) => {
        // Download soundscape
        if (heritage.soundscape !== null) {
          fs.access(path.join(folderPath, sound_filename(heritage.soundscape.media.mp3)), (notexist) => {
            if (notexist) {
              downloadFile(sound_address(heritage.soundscape.media.mp3), folderPath, {}, (url,location) => {
                soundCallback(null);
              });
            } else {
              // event.trigger('send-status', 'File already exists.\n');
              soundCallback(null);
            }
          });
        } else {
          soundCallback(null);
        }
      },

      (musicCallback) => {
        // Download theme song
        if (!isNaN(parseInt(heritage.music))) {
          fs.access(path.join(savePath.musicPath, music_filename(heritage.music)), (notexist) => {
            if (notexist) {
              downloadFile(music_address(heritage.music), savePath.musicPath, {}, (url, location) => {
                musicCallback(null);
              });
            } else {
              // event.trigger('send-status', 'File already exists.\n');
              musicCallback(null);
            }
          });
        } else {
          musicCallback(null);
        }
      },

      (dcCallback) => {
        event.trigger('send-status', `${folderName} download completed. \n`);
        dcCallback(null);
      }], (error, results) => {
        dataCallback(null);
      });

  }, () => {
    event.trigger('send-status', `All download completed. \n`);
});
}

exports.downloadHeritageData = downloadHeritageData;
