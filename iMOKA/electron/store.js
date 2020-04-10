const electron = require('electron');
const path = require('path');
const fs = require('fs');

class Store {
  constructor(opts) {
    // renderer has to get `app` module via remote, main gets it directly
    const userDataPath = (electron.app || electron.remote.app).getPath('userData');
    this.path = path.join(userDataPath, opts.configName + '.json');
    this.data = parseDataFile(this.path, opts.defaults);
    this.userDataPath=userDataPath;
  }

  get(key) {
    return this.data[key];
  }

  set(key, val) {
    if ( this.data[key] ){
        this.data[key] = { ...this.data[key], ...val }
    } else {
        this.data[key]= val;
    }
    this.save();
  }
  
  save(){
      fs.writeFileSync(this.path, JSON.stringify(this.data));  
  }
  
  del(key){
      delete this.data[key];
      this.save();
  }
}

function parseDataFile(filePath, defaults) {
  try {
    return JSON.parse(fs.readFileSync(filePath));
  } catch(error) {
    return defaults;
  }
}

module.exports = Store;