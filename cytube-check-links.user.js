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

const youtubeRegex = /^([^.]+\.)?youtube\./,
  // source: https://stackoverflow.com/a/59189907
  youtubeCheckUrl = 'https://www.youtube.com/oembed?url=',
  requestLimit = 0;

const buttonContainer = document.querySelector('#plcontrol');
if (!buttonContainer) return;

GM.addStyle(`
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
let button =
  createHTMLElement(`<button id="checkLinks" class="btn btn-sm btn-default collapsed">
  check
</button>`);
buttonContainer.insertAdjacentElement('beforeend', button);
button.onclick = checkPlaylistLinks;

async function checkPlaylistLinks() {
  const playlistLinks = document.querySelectorAll('#queue a');

  console.log(
    `checking ${
      requestLimit && requestLimit < playlistLinks.length ? requestLimit + '/' : ''
    }${playlistLinks.length} playlist videos...`
  );
  let requests = [],
    online = 0,
    offline = 0,
    private = 0;
  for (const link of playlistLinks) {
    if (requestLimit && requests.length > requestLimit) break;
    const isYoutubeUrl = youtubeRegex.test(new URL(link.href).hostname);
    requests.push(
      GM.xmlHttpRequest({
        url: isYoutubeUrl ? youtubeCheckUrl + link.href : link.href,
        method: 'head',
        onerror(response) {
          console.log('video offline:', link, response);
          link.classList.add('offline');
          offline++;
        },
        onload(response) {
          switch (response.status) {
            case 200:
              link.classList.add('online');
              online++;
              break;
            case 403:
              console.log('video private (403):', link);
              link.classList.add('private');
              private++;
              break;
            case 404:
              console.log('video offline (404):', link);
              link.classList.add('offline');
              offline++;
              break;
          }
        },
      })
    );
  }

  await Promise.allSettled(requests);
  console.log(
    `playlist status: ${online} online, ${offline} offline, ${private} private`
  );
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
