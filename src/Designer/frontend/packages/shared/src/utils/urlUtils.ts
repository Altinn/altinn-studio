import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';

export const buildQueryParams = <T extends KeyValuePairs>(params: T): string => {
  const separator = (currentParamNumber: number) => (currentParamNumber === 0 ? '?' : '&');
  return Object.keys(params)
    .map((param, index) => `${separator(index)}${param}=${params[param]}`)
    .join('');
};
