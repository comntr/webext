const DEFAULT_HTML_SERVER = 'https://comntr.github.io';
const WATCHLIST_PAGE = '/watchlist';
const COMMENTS_PAGE = '/';
const MENU_ID_WATCHLIST = 'watchlist';
const MENU_ID_COMMENTS = 'comments';
const DEFAULT_DATA_SERVER = 'https://comntr.live:42751';
const TAB_UPDATE_DELAY = 1000; // ms

const log = (...args) => console.log(...args);
log.error = (...args) => console.error(...args);

let tabUpdateTimer = 0;

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
    let url = host + '/' + hash + '/size';
    log('GET', url);
    let rsp = await fetch(url);
    log(rsp.status, rsp.statusText);
    let size = parseInt(await rsp.text());
    log('size:', size);

    await setBadgeText({
      title: size == 1 ? '1 comment' : size > 0 ? size + ' comments' : 'No comments yet',
      text: size > 999 ? '1K+' : size + '',
      color: size > 0 ? '#080' : '#000',
      tabId: tab.tabId,
    });
    // updateIcon(size);
  } catch (err) {
    log.error(err);
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

function updateIcon(size) {
  let icon = size > 0 ? makeIcon(size + '', '#080') :
    makeIcon('0', '#444');
  chrome.browserAction.setIcon({
    imageData: icon
  });
}

function makeIcon(label, color) {
  var canvas = document.createElement('canvas');
  canvas.width = 19;
  canvas.height = 19;

  var context = canvas.getContext('2d');
  context.fillStyle = color;
  context.fillRect(0, 0, 19, 19);

  context.fillStyle = "#fff";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = "bold 11px Arial";
  context.fillText(label, 9, 10);

  return context.getImageData(0, 0, 19, 19);
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
      dataServer: DEFAULT_DATA_SERVER,
    }, res => {
      resolve(res.dataServer);
    });
  });
}

async function getHtmlServer() {
  return new Promise(resolve => {
    chrome.storage.sync.get({
      htmlServer: DEFAULT_HTML_SERVER,
    }, res => {
      resolve(res.htmlServer);
    });
  });
}
