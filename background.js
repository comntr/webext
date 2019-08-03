const WEBEXT_NAME = 'Comntr';
const RPC_GET_COMMENTS_COUNT = '/rpc/GetCommentsCount';
const POPUP_PAGE = 'popup.html';
const WATCHLIST_PAGE = '/watchlist';
const COMMENTS_PAGE = '/';
const BADGE_TEXT_COLOR = '#444';
const BADGE_TEXT_COLOR_ERR = '#000';
const MENU_ID_WATCHLIST = 'watchlist';
const MENU_ID_COMMENTS = 'comments';
const MENU_ID_COMMENTS_FOR_LINK = 'link-comments';
const TAB_UPDATE_DELAY = 1000; // ms
const TAB_UPDATE_SLOW = 50; // ms
const ICON_URL = 'icons/16.png';

let tabUpdateTimer = 0;
let iconImageData = null;
let isMobileDevice = !chrome.contextMenus;
let handlers = {
  [MENU_ID_WATCHLIST]: handleWatchMenuItemClick,
  [MENU_ID_COMMENTS]: handleCommentsMenuItemClick,
  [MENU_ID_COMMENTS_FOR_LINK]: handleCommentsForLinkMenuItemClick,
};

chrome.runtime.onInstalled.addListener(() => {
  log('isMobileDevice?', isMobileDevice);
  setTimeout(scheduleCurrentTabStatusUpdate, 0);

  if (!isMobileDevice) {
    // The popup can't ask for "tabs" permission
    // without an explicit user action.
    //
    // chrome.browserAction.setPopup({
    //  popup: POPUP_PAGE
    // });

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

    chrome.contextMenus.create({
      id: MENU_ID_COMMENTS_FOR_LINK,
      title: 'See comments for this URL',
      contexts: ['link'],
    });
  }
});

chrome.tabs.onUpdated.addListener((tabId, changes, tab) => {
  log('onUpdated:', tabId);
  scheduleCurrentTabStatusUpdate();
});

chrome.tabs.onActivated.addListener(info => {
  log('onActivated:', info.tabId);
  scheduleCurrentTabStatusUpdate();
});

chrome.browserAction.onClicked.addListener(async tab => {
  log('browserAction.onClicked:', tab.id, tab.url);
  let granted = await requestPermissions();
  if (!granted) return;
  tab = await getCurrentTab();
  let srv = await gConfigProps.htmlServerURL.get();
  let params = await gConfigProps.extraUrlParams.get();
  let url = srv + '?' + params + '#' + tab.url;
  chrome.tabs.create({ url });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  log('Context menu clicked:', info);
  log('Current tab:', tab.url);
  let handler = handlers[info.menuItemId];
  handler(tab, info);
});

async function handleCommentsForLinkMenuItemClick(tab, info) {
  await openNewTabWithComments(info.linkUrl);
}

async function handleCommentsMenuItemClick(tab) {
  let granted = await requestPermissions();
  if (!granted) return;
  tab = await getCurrentTab();
  await openNewTabWithComments(tab.url);
}

async function handleWatchMenuItemClick() {
  let srv = await gConfigProps.htmlServerURL.get();
  let url = srv + WATCHLIST_PAGE;
  log('Opening watchlist:', url);
  chrome.tabs.create({ url });
}

async function openNewTabWithComments(topic) {
  log('Opening tab with comments for:', topic);
  if (!topic) return;
  let srv = await gConfigProps.htmlServerURL.get();
  let params = await gConfigProps.extraUrlParams.get();
  let url = srv + '?' + params + '#' + topic;
  chrome.tabs.create({ url });  
}

function scheduleCurrentTabStatusUpdate() {
  clearTimeout(tabUpdateTimer);
  tabUpdateTimer = setTimeout(() => {
    updateCurrentTabStatus();
  }, TAB_UPDATE_DELAY);
}

async function updateCurrentTabStatus() {
  let time = Date.now();
  let tab = await getCurrentTab();

  if (!tab || !tab.url) {
    log('tab.url=null. No permissions?');
    return;
  }

  log('tab:', tab.id, 'url:', JSON.stringify(tab.url));

  try {
    await setIconColor(
      await gConfigProps.iconColorFetching.get(),
      tab.tabId);

    await setBadgeText({
      title: 'Fetching comments...',
      text: '?',
      color: BADGE_TEXT_COLOR,
      tabId: tab.tabId,
    });

    let hash = await sha1(tab.url);
    let host = await gConfigProps.dataServerURL.get();
    let url = host + RPC_GET_COMMENTS_COUNT;
    let body = JSON.stringify([hash]);
    let rtime = Date.now();
    log(RPC_GET_COMMENTS_COUNT, hash.slice(0, 7));
    let rsp = await fetch(url, { method: 'POST', body });
    let json = await rsp.json();
    let [size] = json;
    log(rsp.status, rsp.statusText, JSON.stringify(json),
      Date.now() - rtime, 'ms');

    await setBadgeText({
      title: size == 1 ? '1 comment' :
        size > 0 ? size + ' comments' :
          'Add a comment to this site',
      text: size > 999 ? '1K+' :
        size > 0 ? size + '' :
          '0',
      color: BADGE_TEXT_COLOR,
      tabId: tab.tabId,
    });

    await setIconColor(
      size > 0 ?
        await gConfigProps.iconColorHasComments.get() :
        await gConfigProps.iconColorNoComments.get(),
      tab.tabId);

    let diff = Date.now() - time;
    log.v('Tab update finished:', diff, 'ms');
  } catch (err) {
    log.e(err);
    await setIconColor(
      await gConfigProps.iconColorError.get(),
      tab.tabId);
    await setBadgeText({
      title: err + '',
      text: 'x',
      color: BADGE_TEXT_COLOR_ERR,
      tabId: tab.tabId,
    });
  }
}

async function setBadgeText({ title, text, color, tabId }) {
  if (!chrome.browserAction.setBadgeText) {
    log.w('No setBadgeText() API.');
    await webextcall(callback => {
      chrome.browserAction.setTitle({
        title: WEBEXT_NAME + (text ? ' (' + text + ')' : ''),
        tabId: tabId,
      }, callback);
    });
    return;
  }

  await webextcall(callback => {
    chrome.browserAction.setBadgeText({
      text: text + '',
      tabId: tabId,
    }, callback);
  });

  await webextcall(callback => {
    chrome.browserAction.setBadgeBackgroundColor({
      color: color,
      tabId: tabId,
    }, callback);
  });

  await webextcall(callback => {
    chrome.browserAction.setTitle({
      title: title,
      tabId: tabId,
    }, callback);
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

function parseCssColor(str) {
  if (/^#[0-9a-f]{3}$/.test(str)) {
    let r = parseInt(str[1].repeat(2), 16);
    let g = parseInt(str[2].repeat(2), 16);
    let b = parseInt(str[3].repeat(2), 16);
    return [r, g, b];
  }

  log.w('Invalid CSS color:', str);
  return [0, 0, 0];
}

async function setIconColor(csscolor, tabId) {
  let time = Date.now();

  if (!chrome.browserAction.setIcon) {
    log.w('No setIcon() API.');
    return;
  }

  let [r, g, b] = parseCssColor(csscolor);
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

  await webextcall(callback => {
    chrome.browserAction.setIcon({
      imageData: newImageData,
      tabId,
    }, callback);
  });

  let diff = Date.now() - time;
  log.v('setIconColor():', diff, 'ms');
}
