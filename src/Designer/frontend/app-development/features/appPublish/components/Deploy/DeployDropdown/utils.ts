import { type AppRelease } from 'app-shared/types/AppRelease';
import { type ImageOption } from '../../ImageOption';
import { BuildResult } from 'app-shared/types/Build';
import { DateUtils } from '@studio/pure-functions';
import type i18next from 'i18next';

export const filterSucceededReleases = (appReleases: AppRelease[]): AppRelease[] => {
  return appReleases.filter((appRelease: AppRelease) => isAppReleaseBuiltSuccessful(appRelease));
};

const isAppReleaseBuiltSuccessful = (appRelease: AppRelease): boolean => {
  return appRelease.build.result === BuildResult.succeeded;
};

export const mapAppReleasesToImageOptions = (
  appReleases: AppRelease[],
  t: typeof i18next.t,
): ImageOption[] => {
  return appReleases.map((appRelease: AppRelease) => mapAppReleaseToImageOption(appRelease, t));
};

const mapAppReleaseToImageOption = (appRelease: AppRelease, t: typeof i18next.t): ImageOption => {
  return {
    value: appRelease.tagName,
    label: getImageOptionLabel(appRelease, t),
  };
};

const getImageOptionLabel = (appRelease: AppRelease, t: typeof i18next.t): string => {
  const tagName = appRelease.tagName;
  const createdDateTime = DateUtils.formatDateTime(appRelease.created);
  if (!appRelease.branch) {
    return t('app_deployment.version_label', { tagName, createdDateTime });
  }
  // The label is rendered as text, so escaping would show branch names like feature/x as feature&#x2F;x
  return t('app_deployment.version_label_with_branch', {
    tagName,
    createdDateTime,
    branch: appRelease.branch,
    interpolation: { escapeValue: false },
  });
};
