/**
 * This file contains a type definition for a extended window object in the browser.
 * The extra properties is environment specific variables that is set in the window object by the backend trough the index.cshtml file.
 * Do not extend this object with other properties than the ones that is set in the index.cshtml file.
 * In general we can avoid using custom properties on the window object, but in this case were we need environment specific variables in the frontend, this is the best solution.
 */
type AltinnStudioWindow = typeof window & {
  instrumentationKey?: string;
};
export const altinnStudioWindow: AltinnStudioWindow = window;
