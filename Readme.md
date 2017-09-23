# A Sony Global Resources Downloader
This electron application downloads the photographs in the highest resolution and the sound scape and theme music of all the locations in [Sony Global - alpha CLOCK: WORLD TIME, CAPTURED BY alpha](www.sony.net/united/clock/).

## Usage
1. Install [Node.js](nodejs.org).
2. Clone this repository
```
git clone https://github.com/kenkangxgwe/Sony-Global-Resources-Downloader.git
```
3. Use `npm` to install
```
npm install
```
4. Use `electron` to run
```
electron .
```

## What happened?
All the media will be downloaded into different folders with their own location name (actually their id).
Each location includes 12 photographs took in the same place in various time, 10 other extra photographs in different aspects, and also a `.json` file for a brief introduction of the location.
Some locations also provide soundscapes.
All the theme songs were (by default) put in the `Theme Song of World Heritage` folder.
