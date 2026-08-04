/**
 * Replaces the frontend version in the given HTML string with the selected version.
 */
export function replaceFrontendVersion(html: string, selectedVersion: string): string {
  return html
    .replace(/src="[^"]*\/altinn-app-frontend\.js"/g, `src="${selectedVersion}/altinn-app-frontend.js"`)
    .replace(/href="[^"]*\/altinn-app-frontend\.css"/g, `href="${selectedVersion}/altinn-app-frontend.css"`);
}
