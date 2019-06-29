const $ = selector => document.querySelector(selector);
const $$ = selector => document.querySelectorAll(selector);

const status = {
  set(...args) {
    log(...args);
    $('#status').textContent = args.join(' ');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  log('DOMContentLoaded');
  loadConfig();
  $('#save').onclick = () => saveConfig();
});

async function saveConfig() {
  status.set('Collecting config values.');
  let trows = $$('#config tr');

  for (let tr of trows) {
    let td = tr.querySelector('td:last-child');
    let name = tr.getAttribute('prop');
    let prop = gConfigProps[name];
    let newValue = td.textContent;
    let value = await prop.get();
    
    if (newValue != value) {
      log.i(prop.name, '=', newValue);
      await prop.set(newValue);
    }
  }

  status.set('Config saved.');
}

async function loadConfig() {
  status.set('Loading config.');
  let tbody = $('#config tbody');

  for (let name in gConfigProps) {
    let prop = gConfigProps[name];
    let value = await prop.get();
    log.i(prop.name, ':', value);
    tbody.innerHTML += `
      <tr prop="${name}">
        <td>${prop.name}</td>
        <td contenteditable spellcheck=false>${value}</td>
      </tr>`;
  }

  status.set('Config loaded.');
}
