const DEFAULT_HTML_SERVER = 'https://comntr.github.io';
const DEFAULT_DATA_SERVER = 'https://comntr.live:42751';
const WATCHLIST_PAGE = '/watchlist';
const COMMENTS_PAGE = '/';
const MENU_ID_WATCHLIST = 'watchlist';
const MENU_ID_COMMENTS = 'comments';
const TAB_UPDATE_DELAY = 1000; // ms
const ICON_URL = 'icons/16.png';

const log = (...args) => console.log(...args);
log.error = (...args) => console.error(...args);

let tabUpdateTimer = 0;
let iconImageData = null;

chrome.runtime.onInstalled.addListener(() => {
  log('onInstalled');
  amendContextMenu();

  chrome.tabs.onCreated.addListener((...args) => {
    log('onCreated:', ...args);
  });

  chrome.tabs.onUpdated.addListener((tabId, changes, tab) => {
    log('onUpdated:', tabId);
    scheduleCurrentTabStatusUpdate();
  });

  chrome.tabs.onActivated.addListener(info => {
    log('onActivated:', info.tabId);
    scheduleCurrentTabStatusUpdate();
  });
});

function amendContextMenu() {
  chrome.contextMenus.create({
    id: MENU_ID_WATCHLIST,
    title: 'Open watchlist',
    contexts: ['browser_action'],
  });

  chrome.contextMenus.create({
    id: MENU_ID_COMMENTS,
    title: 'See all comments',
    contexts: ['browser_action'],
  });

  let handlers = {
    [MENU_ID_WATCHLIST]: handleWatchMenuItemClick,
    [MENU_ID_COMMENTS]: handleCommentsMenuItemClick,
  };

  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    log('Context menu clicked:', info);
    log('Current tab:', tab.url);
    let handler = handlers[info.menuItemId];
    handler(tab);
  });
}

async function handleCommentsMenuItemClick(tab) {
  let srv = await getHtmlServer()
  let url = srv + '#' + tab.url;
  log('Opening comments:', url);
  chrome.tabs.create({ url });
}

async function handleWatchMenuItemClick() {
  let srv = await getHtmlServer()
  let url = srv + WATCHLIST_PAGE;
  log('Opening watchlist:', url);
  chrome.tabs.create({ url });
}

function scheduleCurrentTabStatusUpdate() {
  log('Scheduling tab update.');
  clearTimeout(tabUpdateTimer);
  tabUpdateTimer = setTimeout(() => {
    updateCurrentTabStatus();
  }, TAB_UPDATE_DELAY);
}

async function updateCurrentTabStatus() {
  try {
    let time = Date.now();
    log('Getting the current tab.');
    let tab = await getCurrentTab();
    log('tab:', tab.id, tab.url);

    await setBadgeText({
      title: 'Fetching comments...',
      text: '?',
      color: '#444',
      tabId: tab.tabId,
    });

    let hash = await sha1(tab.url);
    log('sha1:', hash);
    let host = await getDataServer();
    let url = host + '/rpc/GetCommentsCount';
    log('POST', url);
    let body = JSON.stringify([hash]);
    let rsp = await fetch(url, { method: 'POST', body });
    log(rsp.status, rsp.statusText);
    let [size] = await rsp.json();
    log('size:', size);

    await setBadgeText({
      title: size == 1 ? '1 comment' : size > 0 ? size + ' comments' : 'Add a comment to this site',
      text: size > 999 ? '1K+' : size > 0 ? size + '' : '',
      color: '#444',
      tabId: tab.tabId,
    });

    await setIconColor(size > 0 ?
      [0, 0x80, 0] :
      [0, 0x00, 0]);

    let diff = Date.now() - time;
    if (diff > 0) log('Tab update has taken', diff, 'ms');
  } catch (err) {
    log.error(err);
    setIconColor([0x80, 0x80, 0]);
  }
}

async function setBadgeText({ title, text, color, tabId }) {
  await new Promise((resolve, reject) => {
    chrome.browserAction.setBadgeText({
      text: text + '',
      tabId: tabId,
    }, (res, err) => {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });

  await new Promise((resolve, reject) => {
    chrome.browserAction.setBadgeBackgroundColor({
      color: color,
      tabId: tabId,
    }, (res, err) => {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });

  await new Promise((resolve, reject) => {
    chrome.browserAction.setTitle({
      title: title,
      tabId: tabId,
    }, (res, err) => {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
}

async function getCurrentTab() {
  return new Promise(resolve => {
    chrome.tabs.query({
      active: true,
      currentWindow: true,
    }, tabs => {
      resolve(tabs[0]);
    });
  });
}

function loadDefaultIconImageData() {
  if (iconImageData)
    return Promise.resolve(iconImageData);

  return new Promise((resolve, reject) => {
    let img = document.createElement('img');
    let canvas = document.createElement('canvas');
    img.src = chrome.runtime.getURL(ICON_URL);
    img.onerror = reject;
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      let ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      iconImageData = ctx.getImageData(0, 0, img.width, img.height);
      resolve(iconImageData);
    };
  });
}

async function setIconColor([r, g, b]) {
  let iconImageData = await loadDefaultIconImageData();
  let w = iconImageData.width;
  let h = iconImageData.height;
  let canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  let newContext = canvas.getContext('2d');
  let newImageData = newContext.getImageData(0, 0, w, h);
  let rgba = newImageData.data;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let p = (y * w + x) * 4;
      let a = iconImageData.data[p + 3];
      if (a > 0) {
        rgba[p + 0] = r;
        rgba[p + 1] = g;
        rgba[p + 2] = b;
        rgba[p + 3] = a;
      }
    }
  }

  newContext.putImageData(newImageData, 0, 0);

  await new Promise((resolve, reject) => {
    chrome.browserAction.setIcon({
      imageData: newImageData,
    }, (res, err) => {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
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

async function getDataServer() {
  return new Promise(resolve => {
    chrome.storage.sync.get({
      dataServer: null,
    }, (res = {}) => {
      resolve(res.dataServer || DEFAULT_DATA_SERVER);
    });
  });
}

async function getHtmlServer() {
  return new Promise(resolve => {
    chrome.storage.sync.get({
      htmlServer: null,
    }, (res = {}) => {
      resolve(res.htmlServer || DEFAULT_HTML_SERVER);
    });
  });
}
