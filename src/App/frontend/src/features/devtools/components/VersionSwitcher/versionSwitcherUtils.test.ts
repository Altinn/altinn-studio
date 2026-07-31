import { replaceFrontendVersion } from 'src/features/devtools/components/VersionSwitcher/versionSwitcherUtils';

describe('versionSwitcherUtils', () => {
  it('replaces the js and css asset urls with the selected version', () => {
    const html = `
<html lang="nb" dir="ltr" class="viewport-is-desktop"><head>
  <meta charset="utf-8">

  <!-- <link rel="stylesheet" type="text/css" href="https://altinncdn.no/toolkits/altinn-app-frontend/4.31.3-preview.1/altinn-app-frontend.css"> -->
  <link rel="stylesheet" type="text/css" href="https://altinncdn.no/toolkits/altinn-app-frontend/4/altinn-app-frontend.css">
  <base href="https://ttd.apps.tt02.altinn.no/ttd/signering-brukerstyrt/"></head>

  <body style="background: rgb(255, 255, 255);">
    <!-- <script src="https://altinncdn.no/toolkits/altinn-app-frontend/4.31.3-preview.1/altinn-app-frontend.js"></script> -->
    <script src="https://altinncdn.no/toolkits/altinn-app-frontend/4/altinn-app-frontend.js"></script>
  </body>
  </html>
      `;

    const expected = `
<html lang="nb" dir="ltr" class="viewport-is-desktop"><head>
  <meta charset="utf-8">

  <!-- <link rel="stylesheet" type="text/css" href="https://altinncdn.no/toolkits/altinn-app-frontend/4.60/altinn-app-frontend.css"> -->
  <link rel="stylesheet" type="text/css" href="https://altinncdn.no/toolkits/altinn-app-frontend/4.60/altinn-app-frontend.css">
  <base href="https://ttd.apps.tt02.altinn.no/ttd/signering-brukerstyrt/"></head>

  <body style="background: rgb(255, 255, 255);">
    <!-- <script src="https://altinncdn.no/toolkits/altinn-app-frontend/4.60/altinn-app-frontend.js"></script> -->
    <script src="https://altinncdn.no/toolkits/altinn-app-frontend/4.60/altinn-app-frontend.js"></script>
  </body>
  </html>
      `;

    const selectedVersion = 'https://altinncdn.no/toolkits/altinn-app-frontend/4.60';
    const result = replaceFrontendVersion(html, selectedVersion);
    expect(result).toBe(expected);
  });
});
