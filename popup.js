setTimeout(async () => {
  let tab = await getCurrentTab();
  let srv = await gConfigProps.htmlServerURL.get();
  let params = await gConfigProps.extraUrlParams.get();
  let iframe = document.querySelector('body > iframe');
  iframe.src = srv + '?' + params + '#' + tab.url;

  if ('orientation' in window)
    document.body.parentElement.classList.add('mobile');  
});
