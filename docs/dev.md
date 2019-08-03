# Relevant Repos

- [webext](comntr/webext) is the browser extension. It's just a shell for the main UI.
  - [comntr.github.io](comntr/comntr.github.io) is the main UI. Most of the activity happens here. The extension renders this UI in an iframe when the user clicks on the extension icon.
    - [captcha](comntr/captcha) is the basic captcha service.
    - [http-server](comntr/http-server) is the main data server. It stores the comments.

# How to debug the extension

- Chrome can load the `comntr/webext` repo dir as an unpacked extension.
- `npm run xpi` makes a `xpi/comntr.xpi` zip file that can be installed on Firefox desktop.
- `npm run xpi-prod` makes a `xpi/comntr.xpi` zip file that can be published to `addons.mozilla.org`.
- `npm run adb-push` creates a zip file on the connected Android device. It can be opened on Firefox Android at the `file:///mnt/sdcard/WebExt/comntr.xpi` URL.

# How to create your own comntr server

1. Get a VPS. I used a DigitalOcean VPS with a LetsEncrypt cert.
1. Register your own domain: `foobar.com`.
1. Look for `comntr.live` in sources and use `foobar.com` instead.
1. Start the http server:
  1. Push the http server bits to your VPS:
      ```bash
      cd comntr/http-server
      npm run ssh-push
      ```
  1. SSH to the VPS and start the server:
      ```bash
      ssh root@foobar.com
      cd ~/comntr.io
      npm start &
      disown
      exit
      ```
  1. Check that the server is available at `https://foobar.com:42751/`.
1. Start the captcha service:
  1. Push the captcha service bits to your VPS:
      ```bash
      cd comntr/captcha
      npm run rsync
      ```
  1. SSH to the VPS and start the capctah service:
      ```bash
      ssh root@foobar.com
      cd ~/comntr/captcha
      npm start &
      disown
      exit
      ```
  1. Check that the service is available at `https://foobar.com:2556/`.
1. Fork `comntr.github.io` to your own `username.github.io` or serve the web app from your own domain, e.g. `https://foobar:443/`. Make sure that references to `comntr.github.io` are updated to the new domain name.
1. Publish your own copy of the extension:
    ```bash
    cd comntr/webext
    npm run xpi-prod
    ```
