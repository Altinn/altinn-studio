export const getPageTitle = (appName: string, title?: string, appOwner?: string) => {
  let result = appName;
  if (title) {
    result = `${title} - ${appName}`;
  }
  if (appOwner) {
    result += ` - ${appOwner}`;
  }
  return result;
};
