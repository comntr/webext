const log = (...args) => log.i(...args);

log.v = (...args) => {
  log.save('D', ...args);
  console.log('D', ...args);
};

log.i = (...args) => {
  log.save('I', ...args);
  console.info('I', ...args);
};

log.w = (...args) => {
  log.save('W', ...args);
  console.warn('W', ...args);
};

log.e = (...args) => {
  log.save('E', ...args);
  console.error('E', ...args);
};

log.logs = [];
log.logs.maxlen = 4096;

log.save = (tag, ...args) => {
  let time = new Date().toISOString();
  let text = [time, tag, ...args].join(' ');
  log.logs.push(text);
  if (log.logs.length > log.logs.maxlen)
    log.logs.splice(0, 1);
};

function webextcall(fn) {
  return new Promise((resolve, reject) => {
    fn((res, err) => {
      err ? reject(err) : resolve(res);
    });
  });
}

async function requestPermissions() {
  let granted = await webextcall(callback => {
    chrome.permissions.request({
      permissions: [
        'tabs',
      ],
    }, callback);
  });

  return granted;
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
      chrome.storage.local.get(props, callback));
    let value = res && res[this.name];
    return value || this.defval;
  }

  async set(value) {
    let props = {};
    props[this.name] = value;
    await webextcall(callback =>
      chrome.storage.local.set(props, callback));
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
