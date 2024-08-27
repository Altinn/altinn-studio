import type { AxiosError } from 'axios';

/**
 * Checks if an error is an AxiosError.
 *
 * We implement our own version of this function because the one in axios can sometimes lead to circular dependencies.
 *
 * @see https://raw.githubusercontent.com/axios/axios/v1.x/lib/helpers/isAxiosError.js
 */
export function isAxiosError(thing: unknown): thing is AxiosError {
  return !!thing && typeof thing === 'object' && 'isAxiosError' in thing && thing.isAxiosError === true;
}
