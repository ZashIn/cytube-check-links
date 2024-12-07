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
#queue a.unknown {
    color: yellow;
}
#queue a.online {
    color: green;
}
#queue a.offline {
    color: red;
}
#queue a.private {
    color: orangered;
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
        } else if (stat > 400 && stat <= 403) {
          console.log(`video private (${stat}):`, link);
          link.classList.add('private');
        } else if (stat == 200) {
          link.classList.add('online');
        } else {
          console.log(`other video status (${stat}):`, link);
          link.classList.add('unknown');
        }
      },
    };
    requestStack.push(GM.xmlHttpRequest(rDetails));
  }

  await Promise.allSettled(requestStack);
  const checked = playlistContainer.querySelectorAll(`.checked`).length;
  const linkStatus = {
    online: playlistContainer.querySelectorAll(`.online`),
    offline: playlistContainer.querySelectorAll(`.offline`),
    private: playlistContainer.querySelectorAll(`.private`),
    unknown: playlistContainer.querySelectorAll(`.unknown`),
  };
  const linkStatusEntries = Object.entries(linkStatus).filter(
    ([k, v]) => k == 'online' || v.length > 0
  );
  console.log(
    `playlist status: ${checked}/${playlistLinks.length} checked:`,
    linkStatusEntries.map(([k, v]) => `${v.length} ${k}`).join(', ')
  );
  console.log(...linkStatusEntries.flat());
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
