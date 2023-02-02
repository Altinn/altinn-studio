import { BuildResult, BuildStatus, IRelease } from '../../../sharedResources/appRelease/types';

export function versionNameValid(releases: IRelease[], tagName: string): boolean {
  if (
    releases.find(
      (r) =>
        r.tagName.toLowerCase() === tagName.trim() &&
        (r.build.result === BuildResult.succeeded || r.build.status === BuildStatus.inProgress)
    )
  ) {
    return false;
  }

  if (tagName[0] === '.' || tagName[0] === '-') {
    return false;
  }
  if (!tagName.match(new RegExp('^[a-z0-9.-]*$'))) {
    return false;
  }
  return tagName.length <= 128;
}
