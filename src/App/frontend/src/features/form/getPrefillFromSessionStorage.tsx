import { getApplicationMetadata } from 'src/features/applicationMetadata';

const oneHourInMs = 60 * 60 * 1000;
const statelessPrefillCache = new Map<string, string>();

export function getPrefillFromSessionStorage(uiFolder: string): string | undefined {
  const rawParams = sessionStorage.getItem('queryParams');
  if (!rawParams) {
    return statelessPrefillCache.get(uiFolder);
  }

  const appMetadata = getApplicationMetadata();
  const queryParams: unknown = JSON.parse(rawParams);
  if (!Array.isArray(queryParams)) {
    return undefined;
  }

  const validEntries = queryParams.filter(
    (param): param is Record<string, unknown> =>
      typeof param === 'object' && param !== null && param.appId === appMetadata.id,
  );

  const prefillByDataType = Object.fromEntries(
    validEntries.flatMap((entry) => {
      if (typeof entry.dataModelName !== 'string') {
        return [];
      }
      if (!entry.prefillFields || typeof entry.prefillFields !== 'object') {
        return [];
      }

      const createdTime = new Date(entry.created as string).getTime();
      if (Number.isNaN(createdTime) || Date.now() - createdTime > oneHourInMs) {
        return [];
      }

      return [[entry.dataModelName, entry.prefillFields]];
    }),
  );

  if (Object.keys(prefillByDataType).length === 0) {
    return statelessPrefillCache.get(uiFolder);
  }

  const prefill = JSON.stringify(prefillByDataType);
  statelessPrefillCache.set(uiFolder, prefill);
  return prefill;
}
