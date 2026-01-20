import type { ApplicationMetadata } from 'src/features/applicationMetadata/types';

type MetadataModifier = (metadata: ApplicationMetadata) => void;

/**
 * Intercepts the initial HTML page load and modifies the embedded
 * applicationMetadata in window.altinnAppGlobalData.
 *
 * @param modifier - A function that receives the applicationMetadata and can modify it in place
 * @param alias - Optional alias for the intercept (defaults to 'htmlWithModifiedMetadata')
 *
 * @example
 * // Modify promptForParty setting
 * interceptAppMetadata((metadata) => {
 *   metadata.promptForParty = 'always';
 * });
 *
 * @example
 * // Set up instance selection
 * interceptAppMetadata((metadata) => {
 *   metadata.onEntry = {
 *     show: 'select-instance',
 *     instanceSelection: {
 *       sortDirection: 'desc',
 *       rowsPerPageOptions: [1, 2, 3],
 *       defaultSelectedOption: 1,
 *     },
 *   };
 * });
 */
export function interceptAppMetadata(modifier: MetadataModifier, alias = 'htmlWithModifiedMetadata'): void {
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
