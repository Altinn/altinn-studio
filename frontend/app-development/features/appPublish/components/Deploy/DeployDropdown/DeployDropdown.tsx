import React, { type ReactElement } from 'react';
import classes from './DeployDropdown.module.css';
import { StudioCombobox, StudioError, StudioSpinner } from '@studio/components-legacy';
import type { ImageOption } from '../../ImageOption';
import { useTranslation } from 'react-i18next';
import { useAppReleasesQuery } from 'app-development/hooks/queries';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { DeployPopover } from './DeployPopover';
import { type AppRelease } from 'app-shared/types/AppRelease';
import { filterSucceededReleases, mapAppReleasesToImageOptions } from './utils';

export type DeployDropdownProps = {
  appDeployedVersion: string;
  disabled: boolean;
  setSelectedImageTag: (tag: string) => void;
  selectedImageTag: string;
  startDeploy: () => void;
  isPending: boolean;
};

export const DeployDropdown = ({
  appDeployedVersion,
  selectedImageTag,
  setSelectedImageTag,
  disabled,
  startDeploy,
  isPending,
}: DeployDropdownProps): ReactElement => {
  const { org, app } = useStudioEnvironmentParams();
  const { t } = useTranslation();

  const {
    data: releases = [],
    isPending: isPendingReleases,
    isError: hasReleasesError,
  } = useAppReleasesQuery(org, app, { hideDefaultError: true });

  if (isPendingReleases)
    return (
      <StudioSpinner showSpinnerTitle={false} spinnerTitle={t('app_deployment.releases_loading')} />
    );

  if (hasReleasesError) return <StudioError>{t('app_deployment.releases_error')}</StudioError>;

  const successfullyBuiltAppReleases: AppRelease[] = filterSucceededReleases(releases);
  const imageOptions: ImageOption[] = mapAppReleasesToImageOptions(successfullyBuiltAppReleases, t);

  const hasSelectedImageTag = selectedImageTag && imageOptions?.length > 0;
  const selectedVersion = hasSelectedImageTag ? [selectedImageTag] : undefined;

  return (
    <div className={classes.deployDropDown}>
      <StudioCombobox
        size='small'
        value={selectedVersion}
        label={t('app_deployment.choose_version')}
        onValueChange={(selectedImageOptions: string[]) =>
          setSelectedImageTag(selectedImageOptions[0])
        }
        disabled={disabled}
      >
        {imageOptions.map((imageOption: ImageOption) => {
          return (
            <StudioCombobox.Option key={imageOption.value} value={imageOption.value}>
              {imageOption.label}
            </StudioCombobox.Option>
          );
        })}
        <StudioCombobox.Empty>{t('app_deployment.no_versions')}</StudioCombobox.Empty>
      </StudioCombobox>
      <div className={classes.deployButton}>
        <DeployPopover
          appDeployedVersion={appDeployedVersion}
          selectedImageTag={selectedImageTag}
          disabled={disabled}
          isPending={isPending}
          onConfirm={startDeploy}
        />
      </div>
    </div>
  );
};
