export const DEFAULT_SEARCH_PARAMS = {
  range: 1440,
  environment: 'production',
};

export function createSearchParams(obj: Record<string, unknown>) {
  const searchParams = new URLSearchParams(
    Object.fromEntries(
      Object.entries(obj)
        .filter(([k, v]) => v != null && v != DEFAULT_SEARCH_PARAMS[k])
        .map(([k, v]) => [k, JSON.stringify(v)]),
    ),
  ).toString();

  return !!searchParams ? `?${searchParams}` : '';
}
