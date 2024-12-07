// ==UserScript==
// @name        cytu.be link checker
// @namespace   Violentmonkey Scripts
// @match       https://cytu.be/r/*
// @grant       GM.addStyle
// @grant       GM.xmlHttpRequest
// @version     1.0
// @author      Zash
// @description Adds button to check playlist for offline / private videos
// @run-at      document-idle
// ==/UserScript==

const requestLimit = 0,
  // source: https://stackoverflow.com/a/59189907
  youtubeCheckUrl = 'https://www.youtube.com/oembed?url=',
  youtubeRegex = /^([^.]+\.)?youtube\./;

// cytube
const playlistContainer = document.querySelector('#queue'),
  buttonContainer = document.querySelector('#plcontrol');
if (!playlistContainer || !buttonContainer) return;

GM.addStyle(`
#queue .unknown {
    color: yellow;
}
#queue .online {
    color: green;
}
#queue .offline {
    color: red;
}
#queue .private {
    color: orangered;
}
#queue .link-status {
  /* same as qe_time */
  float: right;
  font-family: Monospace;
  margin-right: 1em;
}
`);

buttonContainer.insertAdjacentElement(
  'beforeend',
  createHTMLElement(
    `<button id="checkLinks" class="btn btn-sm btn-default collapsed">
  check
</button>`
  )
).onclick = checkPlaylistLinks;

async function checkPlaylistLinks() {
  const playlistLinks = playlistContainer.querySelectorAll('a');

  console.log(
    `checking ${
      requestLimit && requestLimit < playlistLinks.length ? requestLimit + '/' : ''
    }${playlistLinks.length} playlist videos...`
  );
  let requestStack = [],
    requests = 0;
  for (const link of playlistLinks) {
    if (link.classList.contains('checked')) continue;
    if (requestLimit && ++requests > requestLimit) break;
    await asyncRequestAnimationFrame();
    const isYoutubeUrl = youtubeRegex.test(new URL(link.href).hostname);
    const rDetails = {
      url: isYoutubeUrl ? youtubeCheckUrl + link.href : link.href,
      method: 'head',
      onerror(response) {
        rDetails.onload(response);
      },
      onload(response) {
        link.classList.add('checked');
        const stat = response.status;
        link.dataset.status = stat;
        if (stat < 100 || stat >= 404) {
          console.log(`video offline (${stat}):`, link);
          link.classList.add('offline');
          addStatusText(link, stat, 'offline');
        } else if (stat > 400 && stat <= 403) {
          console.log(`video private (${stat}):`, link);
          link.classList.add('private');
          addStatusText(link, stat, 'private');
        } else if (stat == 200) {
          link.classList.add('online');
        } else {
          console.log(`other video status (${stat}):`, link);
          link.classList.add('unknown');
          addStatusText(link, stat, 'unknown');
        }
      },
    };
    requestStack.push(GM.xmlHttpRequest(rDetails));
  }

  await Promise.allSettled(requestStack);
  logLinkStatus(playlistLinks);
  if (getOfflineLinks().length) {
    addCopyOfflineButton();
    addDeleteButton();
  }
}

function addStatusText(link, statusText, statusClass) {
  link.parentElement
    .querySelector(':scope > span.qe_time')
    .insertAdjacentHTML(
      'afterend',
      `<span class="link-status ${statusClass}">${statusText}</span>`
    );
}

function logLinkStatus(playlistLinks) {
  const checked = playlistContainer.querySelectorAll(`a.checked`).length;
  const linkStatus = {
    online: playlistContainer.querySelectorAll(`a.online`),
    offline: playlistContainer.querySelectorAll(`a.offline`),
    private: playlistContainer.querySelectorAll(`a.private`),
    unknown: playlistContainer.querySelectorAll(`a.unknown`),
  };
  const linkStatusEntries = Object.entries(linkStatus).filter(
    ([k, v]) => k == 'online' || v.length > 0
  );
  console.log(
    `playlist status: ${checked}/${playlistLinks.length} checked:`,
    linkStatusEntries.map(([k, v]) => `${v.length} ${k}`).join(', ')
  );
  const offlineVideos = getOfflineVideoNames();
  if (offlineVideos.length) {
    console.log(`offline/private videos:\n${offlineVideos.join('\n')}`);
  }
}

function addCopyOfflineButton(show = true) {
  const id = 'copyOfflineVideos';
  let button = document.getElementById(id);
  if (!button) {
    button = buttonContainer.insertAdjacentElement(
      'beforeend',
      createHTMLElement(
        `<button id="${id}" class="btn btn-sm btn-default collapsed" style="display: none;">
    copy offline
  </button>`
      )
    );
    button.onclick = () => {
      navigator.clipboard.writeText(getOfflineVideoNames().join('\n'));
    };
  }
  if (show) {
    button.style.display = '';
  }
}

function addDeleteButton(show = true) {
  const id = 'deleteOffline';
  let button = document.getElementById(id);
  if (!button) {
    button = buttonContainer.insertAdjacentElement(
      'beforeend',
      createHTMLElement(
        `<button id="${id}" class="btn btn-sm btn-default collapsed" style="display: none;">
    delete offline
  </button>`
      )
    );
    button.onclick = deleteOfflineLinks;
  }
  if (show && playlistContainer.querySelector('.qbtn-delete')) {
    button.style.display = '';
  }
}

function getOfflineLinks() {
  return playlistContainer.querySelectorAll('a.offline, a.private');
}
/**
 * @param {NodeListOf<HTMLAnchorElement} offlineLinks
 * @returns {string[]}
 */
function getOfflineVideoNames(offlineLinks = getOfflineLinks()) {
  return Array.prototype.map.call(offlineLinks, (a) => a.textContent);
}

async function deleteOfflineLinks() {
  const offlineLinks = getOfflineLinks();
  let deleted = 0;
  console.log(`deleting ${offlineLinks.length} offline links...`);
  for (const link of offlineLinks) {
    const deleteButton = link.parentElement.querySelector('.qbtn-delete');
    await asyncRequestAnimationFrame();
    if (deleteButton) {
      deleteButton.click();
      console.log(link, 'deleted');
      deleted++;
    }
  }
  console.log(`${deleted / offlineLinks.length} offline links deleted.`);
}

/**
 * @param {string} html
 * @returns {Node}
 */
function createHTMLElement(html) {
  const template = document.createElement('template');
  template.innerHTML = html;
  return template.content.firstChild;
}

async function asyncRequestAnimationFrame() {
  return new Promise((resolve) => {
    requestAnimationFrame(resolve);
  });
}
