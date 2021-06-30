import getRepoNameFromPath from "./getRepoNameFromPath";

function getRepoNameFromLocation(): string | undefined {
  if (!window) {
    return undefined;
  }
  return getRepoNameFromPath(window.location.pathname);
}
export default getRepoNameFromLocation;
