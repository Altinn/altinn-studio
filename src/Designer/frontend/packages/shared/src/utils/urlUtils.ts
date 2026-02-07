import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';

export const buildQueryParams = <T extends KeyValuePairs>(params: T): string => {
  const separator = (currentParamNumber: number) => (currentParamNumber === 0 ? '?' : '&');
  return Object.keys(params)
    .map((param, index) => `${separator(index)}${param}=${params[param]}`)
    .join('');
};

export const getValidExternalUrl = (value: string): string | undefined => {
  if (!value) return undefined;

  const trimmed = value.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    const hostname = url.hostname;
    if (!hostname.includes('.') && hostname !== 'localhost') return undefined;
    return withProtocol;
  } catch {
    return undefined;
  }
};
