import getRepoNameFromPath from "./getRepoNameFromPath";
import getRepoTypeFromName from "./getRepoTypeFromName";

function getRepoTypeFromLocation(): string | undefined {
  if (!window) {
    return undefined;
  }
  const repoName = getRepoNameFromPath(window.location.pathname);
  return getRepoTypeFromName(repoName[repoName.length - 1]);
}
export default getRepoTypeFromLocation;
