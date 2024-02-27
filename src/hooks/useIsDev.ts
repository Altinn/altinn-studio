const devHostNames = [/^local\.altinn\.cloud$/, /^\S+\.apps\.tt02\.altinn\.no$/];
const studioHostNames = [/^dev\.altinn\.studio$/, /^altinn\.studio$/, /^studio\.localhost$/];

/**
 * Indicates whether the application is running in a development environment.
 * This can be either through LocalTest, altinn studio preview or TT02.
 */
export function useIsDev(): boolean {
  const isLocalOrStaging = useIsLocalOrStaging();
  const isStudioPreview = useIsStudioPreview();
  return isLocalOrStaging || isStudioPreview;
}

/**
 * Indicates whether the application is running through LocalTest or in TT02 (staging).
 */
export function useIsLocalOrStaging(): boolean {
  return devHostNames.some((host) => host.test(window.location.hostname));
}

/**
 * Indicates whether the application is running in Altinn Studio Preview.
 */
export function useIsStudioPreview(): boolean {
  return studioHostNames.some((host) => host.test(window.location.hostname));
}
