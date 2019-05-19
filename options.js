const CONFIG = {
  htmlServer: 'https://comntr.github.io',
  dataServer: 'https://comntr.live:42751',
};

const $ = selector => document.querySelector(selector);
const log = (...args) => console.log(...args);

log.status = (...args) => {
  log(...args);
  $('#status').textContent = args.join(' ');
};

document.addEventListener('DOMContentLoaded', () => {
  log('DOMContentLoaded');
  loadConfig();
  $('#save').onclick = () => saveConfig();
});

function saveConfig() {
  log.status('Collecting config values.');
  let values = {};

  for (let id in CONFIG) {
    let el = $('#' + id);
    values[id] = el.value;
  }

  log.status('Saving config.');
  chrome.storage.sync.set(values, () => {
    log.status('Config saved.');
  });
}

function loadConfig() {
  log.status('Loading config.');
  chrome.storage.sync.get(CONFIG, values => {
    log.status('Got config:', values);
    for (let id in CONFIG) {
      let value = values[id];
      let el = $('#' + id);
      if (el) el.value = value;
      if (!el) log('No such element:', id);
    }
  });
}
