class Site {
  id = null;
  name = null;
  url = null;

  constructor(obj = null) {
    if (obj)
      Object.assign(this, obj);
  }
}


const COOKIE_PREFIX = 'startpage_';
const SITE_PREFIX = COOKIE_PREFIX + 'site_';
const SITE_IDS = COOKIE_PREFIX + 'sites';

const cookies = Object.assign(
  {},
  ...document.cookie
  .split(';')
  .map(c => c.trim())
  .filter(c => c.startsWith(COOKIE_PREFIX))
  .map(c => {
    let [k, v] = c.split('=');
    v = decodeURIComponent(v);
    try {
      v = JSON.parse(v);
    } catch {}
    return { [k.trim()]: v };
  }));

const siteIds = cookies[SITE_IDS] ?? [];
const sites = Object.fromEntries(
  Object.entries(cookies)
  .filter(([id, c]) => id.startsWith(SITE_PREFIX))
  .map(([id, c]) => [ id.substring(SITE_PREFIX.length), new Site(c) ]));

function saveSite(site) {
  sites[site.id] = site;
  document.cookie = SITE_PREFIX + site.id + '=' + encodeURIComponent(JSON.stringify(site)) + ';path=/';
}

function deleteSite(site) {
  delete sites[site.id];
  document.cookie = SITE_PREFIX + site.id + '=;path=/;max-age=0';
}

function saveSitesOrdering() {
  const tmpSiteIds = [...CONTAINER.children]
    .filter(siteEl => siteEl._startpage?.site)
    .map(siteEl => siteEl._startpage.site.id)
    .reverse();
  document.cookie = SITE_IDS + '=' + encodeURIComponent(JSON.stringify(tmpSiteIds)) + ';path=/';
}


const LOCALE = navigator.language || navigator.userLanguage;
const LOCALIZATION_DICT = {
  'Startpage': {
    de: 'Startseite',
  },
};

function L(label) {
  const strings = LOCALIZATION_DICT[label];
  if (strings !== undefined && LOCALE in strings)
    return strings[LOCALE];
  return label;
}


/** @type {Element} */
let CONTAINER = null;

/** @type {Element} */
let TEMPLATE_SITE = null;

function init() {
  CONTAINER = document.querySelector('#container');

  const addSite = CONTAINER.querySelector('.site');
  TEMPLATE_SITE = addSite.cloneNode(true);

  addSite.classList.add('add');
  addSite.querySelector('.toggle').remove();
  addSite.querySelector('.back').remove();
  addSite.querySelector('.link').onclick = () => {
    const siteEl = createSiteElement();
    siteEl._startpage.toggle();
  };

  for (const siteId of siteIds)
    createSiteElement(sites[siteId]);

  document.body.onclick = e => {
    if (![document.body, CONTAINER].includes(e.target))
      return;
    for (const siteEl of CONTAINER.children)
      if (siteEl._startpage?.site.id === null)
        siteEl.remove();
      else if (siteEl._startpage?.toggled === true)
        siteEl._startpage.toggle();
  };
}

function createSiteElement(site = new Site) {
  CONTAINER.prepend(TEMPLATE_SITE.cloneNode(true));
  const siteEl = CONTAINER.children.item(0);
  const siteBefore = siteEl.querySelector('.before');
  const siteFront = siteEl.querySelector('.front');
  /** @type {HTMLAnchorElement} */
  const siteLink = siteFront.querySelector('.link');
  /** @type {HTMLImageElement} */
  const siteIcon = siteLink.querySelector('.icon');
  const siteTitle = siteLink.querySelector('.title');
  const siteToggle = siteFront.querySelector('.toggle');
  const siteBack = siteEl.querySelector('.back');
  /** @type {HTMLInputElement} */
  const siteName = siteBack.querySelector('.name');
  /** @type {HTMLInputElement} */
  const siteUrl = siteBack.querySelector('.url');
  /** @type {HTMLButtonElement} */
  const siteSave = siteBack.querySelector('.save');
  /** @type {HTMLButtonElement} */
  const siteDelete = siteBack.querySelector('.delete');

  siteEl.id = 'site-' + site.id;
  siteEl._startpage = { site };

  if (site.id) {
    siteTitle.innerHTML = siteName.value  = site.name;
    siteLink.href       = siteUrl.value   = site.url;
    siteIcon.src        = favicon(site.url);
  }

  siteEl._startpage.toggled = false;
  siteEl._startpage.toggle = () => {
    siteFront.classList.toggle('hidden');
    siteBack.classList.toggle('hidden');
    siteEl.draggable = siteEl._startpage.toggled = !siteEl._startpage.toggled;
  };

  siteToggle.onclick = () => {
    siteEl._startpage.toggle();
  };

  siteDelete.onclick = () => {
    siteEl._startpage.toggle();
    siteEl.remove();
    if (site.id) {
      deleteSite(site);
      saveSitesOrdering();
    }
  };

  siteSave.onclick = () => {
    let isNewSite = !site.id;
    if (isNewSite)
      siteEl.id = 'site-' + (site.id = Date.now());
    siteTitle.innerHTML = site.name = siteName.value;
    siteLink.href       = site.url  = siteUrl.value;
    siteIcon.src        = favicon(site.url);
    saveSite(site);
    if (isNewSite)
      saveSitesOrdering();
    siteEl._startpage.toggle();
  };

  let nextSibling = null;
  siteEl.ondragstart = e => {
    console.log('start', site.name);
    e.dataTransfer.setData('text', siteEl.id);
    siteBefore.classList.add('invisible');
    if (nextSibling = siteEl.nextElementSibling)
      nextSibling.querySelector('.before').classList.add('invisible');
  };
  let dragoverTimeout = null;
  siteBefore.ondragover = e => {
    e.preventDefault();
    console.log('dragover', site.name);
    siteBefore.classList.add('dragover');
    clearTimeout(dragoverTimeout);
    dragoverTimeout = setTimeout(() => siteBefore.classList.remove('dragover'), 500);
  };
  siteBefore.ondrop = e => {
    e.preventDefault();
    console.log('drop', site.name);
    const dragSiteId = e.dataTransfer.getData("text");
    const dragSiteEl = document.getElementById(dragSiteId);
    CONTAINER.insertBefore(dragSiteEl, siteEl);
    saveSitesOrdering();
  };
  siteEl.ondragend = e => {
    console.log('end', site.name);
    siteBefore.classList.remove('invisible');
    if (nextSibling)
      nextSibling.querySelector('.before').classList.remove('invisible');
  };

  return siteEl;
}

function favicon(url) {
  return 'https://www.google.com/s2/favicons?domain=' + url + '&sz=64';
}
