import type { AltinnAppGlobalData } from 'src/global';

type GlobalDataModifier = (globalData: AltinnAppGlobalData) => void;

/**
 * Intercepts the initial HTML page load and modifies the embedded window.altinnAppGlobalData.
 *
 * @param modifier - A function that receives the altinnAppGlobalData and can modify it in place
 * @param alias - Optional alias for the intercept (defaults to 'htmlWithModifiedAltinnAppGlobalData')
 *
 * @example
 * // Modify promptForParty setting
 * interceptAltinnAppGlobalData((globalData) => {
 *   globalData.applicationMetadata.promptForParty = 'always';
 * });
 *
 * @example
 * // Set up instance selection
 * interceptAltinnAppGlobalData((metadata) => {
 *   metadata.layoutSets.sets = []
 * });
 */
export function interceptAltinnAppGlobalData(
  modifier: GlobalDataModifier,
  alias = 'htmlWithModifiedAltinnAppGlobalData',
): void {
  cy.intercept('GET', '**/ttd/**', (req) => {
    if (!req.headers.accept?.includes('text/html')) {
      return;
    }

    req.continue((res) => {
      if (!res.body || typeof res.body !== 'string' || !res.body.includes('window.altinnAppGlobalData')) {
        return;
      }

      const match = res.body.match(/window\.altinnAppGlobalData\s*=\s*(\{[\s\S]*?\});/);
      if (!match) {
        return;
      }

      const globalData = JSON.parse(match[1]);
      modifier(globalData.applicationMetadata);

      res.body = res.body.replace(
        /window\.altinnAppGlobalData\s*=\s*\{[\s\S]*?\};/,
        `window.altinnAppGlobalData = ${JSON.stringify(globalData)};`,
      );
    });
  }).as(alias);
}
