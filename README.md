# The Lounge · GLM

This folder contains the complete, prebuilt website for glmontherun.com.
No npm installation or build step is needed on GitHub.

## Flexbot channel signup

The home-page Flexbot link opens `flexbot.html`. Its standalone styles and client
are `assets/flexbot-signup.css` and `assets/flexbot-signup.js`; the home-page strip
uses `assets/flexbot-home.css`. The existing Lounge application bundles are unchanged.

Channel owners choose 1–7 days, accept the full-period commitment, and prove channel
control with a temporary code in their public YouTube description. The hosted signup
service creates the start and expiry times after successful verification. Visitors
cannot cancel or shorten an active term, and expired terms do not renew automatically.
Flexbot's separate Website channels dashboard manages the resulting enrollments.

The public client calls `https://flexbot-channel-signup.mrflex420.chatgpt.site`.
Pending verification credentials are kept only in the visitor's session storage and
sent in request bodies. Bot feed credentials belong only in the service's secret
configuration and the operator's local Flexbot data, never in this public repository.

Upload EVERY file and subfolder here into the ROOT of the repository that hosts
this website. index.html must be at the repository root, alongside assets/,
cards/, data/, engine/, and fonts/. Do not upload the outer UPLOAD-TO-GITHUB folder.

The package includes the 778-card archive, the complete Astro Powder library
(194 elements + 24 life presets + 19 wall tools), the solar-system model, fonts,
source/license downloads, the CNAME domain file, and .nojekyll.

GitHub Pages settings: Deploy from a branch, choose the branch you uploaded to
(usually main), and choose /(root). Keep the existing glmontherun.com custom-domain
and DNS setup. Enable HTTPS. This package uses domain-root paths and is intended
for glmontherun.com or a user.github.io root site, not a /repository-name/ subpath.

GitHub Desktop is convenient for uploading the whole package. The browser upload
screen accepts at most 100 files per upload. All individual files here are below
25 MiB; preserve subfolder paths if uploading in batches. The included
astropowder-source.zip is an intentional downloadable license/source artifact;
upload it as-is, without extracting it into the website.

Astro Powder may reload once on first launch to prepare the browser's physics
support. Keep isolation-worker.js and the entire engine/ folder. GitHub Pages
ignores _headers; the same-origin service worker provides the fallback. Use an
up-to-date browser with WebGL, WebAssembly, and SharedArrayBuffer support.

Credits: Illuminati and INWO artwork belongs to Steve Jackson Games and its
credited creators. This is an unofficial fan archive; source links and available
artist credits are included in data/sources.json and the card viewer. Public
republication rights for the full archive have not been established.
Astro Powder and its engine are GPL-3.0; corresponding source and licenses are
included. Geist fonts use the included SIL Open Font License.
