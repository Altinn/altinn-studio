import type { AltinnAppData } from 'src/types/window';

export function reverseName(name: string): string {
  return name.split(' ').reverse().join(' ');
}

// /**
//  * Intercepts an HTML response and modifies window.AltinnAppData before the app initializes.
//  * This is useful for mocking application metadata, instance data, or other preloaded data in Cypress tests.
//  *
//  * @param urlPattern - The URL pattern to intercept (e.g., '**/message', '**/ProcessEnd')
//  * @param modifier - A function that receives the current AltinnAppData and returns the modified version
//  * @param alias - Optional alias for the intercept
//  *
//  * @example
//  * // Modify the nuget version
//  * interceptAltinnAppData('**/message', (data) => ({
//  *   ...data,
//  *   applicationMetadata: {
//  *     ...data.applicationMetadata,
//  *     altinnNugetVersion: '8.1.0.115',
//  *   },
//  * }));
// **/

export function interceptInitialAppData(
  urlPattern: string,
  modifier: (data: AltinnAppData) => AltinnAppData,
  alias?: string,
) {
  const interceptOptions = {
    method: 'GET',
    url: urlPattern,
  };

  cy.intercept(interceptOptions, (req) => {
    req.continue((res) => {
      if (res.body && typeof res.body === 'string') {
        // Find and modify the window.AltinnAppData assignment in the HTML
        // Look for the pattern: window.AltinnAppData = {...}; followed by window.org
        const startMarker = 'window.AltinnAppData = ';
        const endMarker = ';\n      window.org';

        const startIndex = res.body.indexOf(startMarker);
        const endIndex = res.body.indexOf(endMarker, startIndex);

        if (startIndex !== -1 && endIndex !== -1) {
          try {
            const jsonStart = startIndex + startMarker.length;
            const jsonData = res.body.substring(jsonStart, endIndex);
            const data = JSON.parse(jsonData) as AltinnAppData;

            // Apply the modifier function
            const modifiedData = modifier(data);

            const modifiedJson = JSON.stringify(modifiedData);
            res.body = res.body.substring(0, jsonStart) + modifiedJson + res.body.substring(endIndex);
          } catch (e) {
            console.error('Failed to modify AltinnAppData:', e);
          }
        }
      }
    });
  }).as(alias || 'interceptedHTML');
}

/**
 * Returns a Cypress onBeforeLoad callback that patches window.AltinnAppData before the app initializes.
 * This intercepts the JavaScript assignment of window.AltinnAppData and modifies it.
 *
 * Use with cy.visit() or by storing the current URL and revisiting with this callback.
 *
 * @param modifier - A function that receives the current AltinnAppData and returns the modified version
 * @returns A Cypress onBeforeLoad callback
 *
 * @example
 * // Use with cy.visit
 * cy.visit(url, {
 *   onBeforeLoad: patchAltinnAppDataOnVisit((data) => ({
 *     ...data,
 *     applicationMetadata: {
 *       ...data.applicationMetadata,
 *       altinnNugetVersion: '8.1.0.115',
 *     },
 *   })),
 * });
 */
export function patchAltinnAppDataOnVisit(modifier: (data: AltinnAppData) => AltinnAppData) {
  return (win: Window & { AltinnAppData?: AltinnAppData }) => {
    // Closure-backed storage to avoid recursive reads
    let backing: AltinnAppData = {} as AltinnAppData;

    Object.defineProperty(win, 'AltinnAppData', {
      configurable: true,
      enumerable: true,
      get() {
        return backing;
      },
      set(v: AltinnAppData) {
        // Capture the app's inline assignment and patch it
        backing = modifier(v ?? ({} as AltinnAppData));
      },
    });
  };
}
