const log = (...args) => log.v(...args);
log.v = (...args) => console.log('D', ...args);
log.i = (...args) => console.info('I', ...args);
log.w = (...args) => console.warn('W', ...args);
log.e = (...args) => console.error('E', ...args);

function webextcall(fn) {
  return new Promise((resolve, reject) => {
    fn((res, err) => {
      err ? reject(err) : resolve(res);
    });
  });
}

async function getCurrentTab() {
  let tabs = await webextcall(callback => {
    chrome.tabs.query({
      active: true,
      currentWindow: true,
    }, callback);
  });
  
  return tabs[0];
}

class StorageProp {
  constructor(name, defval) {
    this.name = name;
    this.defval = defval;
  }

  async get() {
    let props = {};
    props[this.name] = null;
    let res = await webextcall(callback =>
      chrome.storage.sync.get(props, callback));
    let value = res && res[this.name];
    return value || this.defval;
  }

  async set(value) {
    let props = {};
    props[this.name] = value;
    await webextcall(callback =>
      chrome.storage.sync.set(props, callback));
  }
}

function sha1(str) {
  let bytes = new Uint8Array(str.length);

  for (let i = 0; i < str.length; i++)
    bytes[i] = str.charCodeAt(i) & 0xFF;

  return new Promise(resolve => {
    crypto.subtle.digest('SHA-1', bytes).then(buffer => {
      let hash = Array.from(new Uint8Array(buffer)).map(byte => {
        return ('0' + byte.toString(16)).slice(-2);
      }).join('');

      resolve(hash);
    });
  });
}
