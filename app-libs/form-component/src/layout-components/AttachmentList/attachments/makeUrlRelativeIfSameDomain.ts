export function makeUrlRelativeIfSameDomain(
  url: string,
  location: Location = window.location,
): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === location.hostname) {
      return parsed.pathname + parsed.search + parsed.hash;
    }
  } catch {
    return url;
  }
  return url;
}
