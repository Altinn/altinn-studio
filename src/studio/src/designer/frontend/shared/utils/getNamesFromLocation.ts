import getOrgFromPath from "./getOrgFromPath";
import getRepoNameFromPath from "./getRepoNameFromPath";

function getRepoNameFromLocation(): string[] | undefined {
  if (!window) {
    return undefined;
  }
  if (window.location.pathname.startsWith('/designer')) {
    return [
      getOrgFromPath(window.location.pathname),
      getRepoNameFromPath(window.location.pathname),
    ];
  }
  return [
    getOrgFromPath(window.location.hash),
    getRepoNameFromPath(window.location.hash),
  ];
}
export default getRepoNameFromLocation;
