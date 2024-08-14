export const getRouterRouteByPathname = (pathname: string): string => {
  const pathnameArray = pathname.split('/');
  return pathnameArray[pathnameArray.length - 1];
};
