import { isSafeHref } from '../markdown';

const schemePattern = /^[a-z][a-z\d+.-]*:/i;
const relativeUrlPattern = /^[/#?.]/;

export function normalizeLinkUrl(input: string): string | null {
  const url = input.trim();
  if (!url) return null;
  if (schemePattern.test(url)) return isSafeHref(url) ? url : null;
  if (relativeUrlPattern.test(url)) return url;
  return `https://${url}`;
}
