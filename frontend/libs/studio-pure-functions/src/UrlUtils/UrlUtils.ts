export class UrlUtils {
  /**
   * Returns the last parameter from the url pathname.
   * @param pathname The url pathname to extract the last parameter from.
   * @returns The last parameter from the url pathname.
   */
  static extractLastRouterParam = (pathname: string): string => {
    return extractParamFromEnd(pathname, 1);
  };

  /**
   * Returns the second last parameter from the url pathname.
   * @param pathname The url pathname to extract the second last parameter from.
   * @returns The second last parameter from the url pathname.
   */
  static extractSecondLastRouterParam = (pathname: string): string => {
    return extractParamFromEnd(pathname, 2);
  };
}

function extractParamFromEnd(pathname: string, positionFromEnd: number): string {
  const params = extractParams(pathname);
  return params[params.length - positionFromEnd] || '';
}
const extractParams = (pathname: string): string[] => pathname.split('/');
