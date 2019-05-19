const DEFAULT_HTML_SERVER = 'https://comntr.github.io';

const $ = selector => document.querySelector(selector);

getCurrentTab().then(async tab => {
  let srv = await getHtmlServer();
  let url = srv + '#' + tab.url;
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
      htmlServer: DEFAULT_HTML_SERVER,
    }, res => {
      resolve(res.htmlServer);
    });
  });
}
