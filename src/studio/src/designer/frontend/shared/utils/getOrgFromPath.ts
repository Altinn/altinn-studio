function getOrgFromPath(path: string): string | undefined {
  const tokens = path.split('/');
  if (!tokens.length) {
    return undefined;
  }
  return tokens[tokens.length - 2];
}
export default getOrgFromPath;
