# CyTube: check links
Check playlist links on [cytu.be](https://cytu.be/) for offline / private videos.

Adds buttons for:
- check links: colors the links with $\color{green}\textsf{online (200)}$, $\color{red}\textsf{offline (404)}$, $\color{orangered}\textsf{private (403)}$, $\color{yellow}\textsf{unknown}$ status and adds the HTTP response codes.
  - uses www.youtube.com/oembed API, so there might be a request limit (should be high)
- copy offline & private video titles to clipboard (list of names)
- delete offline & private video links*
- make all permanent*

\* requires channel permissions. Processing can take some time, because of CyTubes list edit interaction limit/delay.

Details like stats (number of online, offline, private, ...) links are logged in the console.