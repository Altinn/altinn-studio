import postalCodes from 'norway-postal-codes';

const __default__ = '';

/**
 * Looks up the post place for a given zip code using the norway-postal-codes package.
 * This hook was designed primarily for use in the Address component.
 */
export function usePostPlace(zipCode: string | undefined, enabled: boolean) {
  const _enabled = enabled && Boolean(zipCode?.length) && zipCode !== __default__ && zipCode !== '0';

  if (!_enabled) {
    return __default__;
  }

  const postPlace = postalCodes[zipCode!];
  return postPlace ?? __default__;
}
