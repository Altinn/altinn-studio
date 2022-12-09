/**
 * We should replace this with a more stable solution which doesn't check on hostname.
 * Backend should send this information as a settings variable to the frontend.
 *
 * @deprecated
 */
export const _useIsProdHack = () =>
  ['www.altinn.studio', 'altinn.studio'].includes(window.location.hostname);
