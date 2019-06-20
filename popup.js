const DEFAULT_HTML_SERVER = 'https://comntr.github.io';

const $ = selector => document.querySelector(selector);

setTimeout(() => {
  if ('orientation' in window)
    document.body.classList.add('mobile');
});

getCurrentTab().then(async tab => {
  let srv = await getHtmlServer();
  let url = srv + '?ext=1#' + tab.url;
  $('iframe').src = url;
});

async function getCurrentTab() {
  return new Promise(resolve => {
    chrome.tabs.query({
      active: true,
      currentWindow: true
    }, tabs => {
      resolve(tabs[0]);
    });
  });
}

async function getHtmlServer() {
  return new Promise(resolve => {
    chrome.storage.sync.get({
      htmlServer: null,
    }, res => {
      resolve(res && res.htmlServer || DEFAULT_HTML_SERVER);
    });
  });
}
