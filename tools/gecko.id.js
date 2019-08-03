const fs = require('fs');

let filepath = process.argv[2];
let textdata = fs.readFileSync(filepath, 'utf8');
let json = JSON.parse(textdata);

extend(json, {
  "browser_specific_settings": {
    "gecko": {
      "id": "webext@comntr.io"
    }
  }
});

let textdata2 = JSON.stringify(json, null, 2);
fs.writeFileSync(filepath, textdata2, 'utf8');

function extend(res, src) {
  for (let key in src) {
    if (res[key] === src[key])
      continue;

    if (key in res) {
      extend(res[key], src[key]);
    } else {
      res[key] = src[key];
    }
  }
}

