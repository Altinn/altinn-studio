function getRepoNameFromPath(path: string): string | undefined {
  const tokens = path.split('/');
  if (!tokens.length) {
    return undefined;
  }
  return tokens[tokens.length - 1];
}
export default getRepoNameFromPath;
