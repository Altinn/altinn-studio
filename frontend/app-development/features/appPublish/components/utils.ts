import type { AppRelease } from 'app-shared/types/AppRelease';
import { BuildResult, BuildStatus } from 'app-shared/types/Build';
import { addMinutesToTime } from 'app-shared/pure/date-format';

export const shouldDisplayDeployStatus = (timestring: string) =>
  new Date() < addMinutesToTime(timestring, 60);

export function versionNameValid(releases: AppRelease[], tagName: string): boolean {
  if (
    releases.find(
      (r) =>
        r.tagName.toLowerCase() === tagName.trim() &&
        (r.build.result === BuildResult.succeeded || r.build.status === BuildStatus.inProgress),
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
