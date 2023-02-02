import type { IAppReleaseState } from '../../../sharedResources/appRelease/appReleaseSlice';
import type { IRepoStatusState } from '../../../sharedResources/repoStatus/repoStatusSlice';
import type { IHandleMergeConflict } from '../../handleMergeConflict/handleMergeConflictSlice';
import { BuildResult, BuildStatus } from '../../../sharedResources/appRelease/types';

export enum ReleaseStatus {
  CannotFetchRelease = 'CAN_NOT_FETCH_RELEASE',
  CheckingStatus = 'CHECKING_STATUS',
  NoReleases = 'NO_RELEASES',
  CurrentMasterIsBuilt = 'CURRENT_MASTER_IS_BUILT',
  BuildInProgress = 'BUILD_IN_PROGRESS',
}

export const getReleaseStatus = (
  appReleases: IAppReleaseState,
  repoStatus: IRepoStatusState,
  handleMergeConflict: IHandleMergeConflict
) => {
  if (appReleases.errors.fetchReleaseErrorCode !== null) {
    return ReleaseStatus.CannotFetchRelease;
  }
  if (!repoStatus.branch.master || !handleMergeConflict.repoStatus.contentStatus) {
    return ReleaseStatus.CheckingStatus;
  }
  if (!appReleases.releases || !appReleases.releases.length) {
    return ReleaseStatus.NoReleases;
  }
  if (
    !!appReleases.releases[0] &&
    appReleases.releases[0].targetCommitish === repoStatus.branch.master.commit.id &&
    appReleases.releases[0].build.status === BuildStatus.completed &&
    appReleases.releases[0].build.result === BuildResult.succeeded
  ) {
    return ReleaseStatus.CurrentMasterIsBuilt;
  }
  if (appReleases.releases[0].build.status !== BuildStatus.completed) {
    return ReleaseStatus.BuildInProgress;
  }
};
