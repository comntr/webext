setTimeout(async () => {
  let tab = await getCurrentTab();
  let srv = await gConfigProps.htmlServerURL.get();
  let iframe = document.querySelector('body > iframe');
  iframe.src = srv + '?ext=1#' + tab.url;

  if ('orientation' in window)
    document.body.parentElement.classList.add('mobile');  
});
