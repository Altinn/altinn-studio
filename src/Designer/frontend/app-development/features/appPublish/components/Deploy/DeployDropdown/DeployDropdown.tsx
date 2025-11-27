import React, { type ReactElement } from 'react';
import classes from './DeployDropdown.module.css';
import { StudioSuggestion, StudioSpinner, StudioError } from '@studio/components';
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
    return <StudioSpinner aria-hidden spinnerTitle={t('app_deployment.releases_loading')} />;

  if (hasReleasesError) return <StudioError>{t('app_deployment.releases_error')}</StudioError>;

  const successfullyBuiltAppReleases: AppRelease[] = filterSucceededReleases(releases);
  const imageOptions: ImageOption[] = mapAppReleasesToImageOptions(successfullyBuiltAppReleases, t);

  const selectedItems = selectedImageTag
    ? imageOptions.filter((option) => option.value === selectedImageTag)
    : [];

  const handleSelectedChange = (items: { value: string }[]) => {
    if (!disabled) {
      setSelectedImageTag(items[0]?.value || '');
    }
  };

  return (
    <div className={classes.deployDropDown}>
      <StudioSuggestion
        selected={selectedItems}
        label={t('app_deployment.choose_version')}
        emptyText={t('app_deployment.no_versions')}
        filter={() => true}
        onSelectedChange={handleSelectedChange}
      >
        {imageOptions.map((imageOption: ImageOption) => {
          return (
            <StudioSuggestion.Option
              key={imageOption.value}
              value={imageOption.value}
              label={imageOption.label}
            >
              {imageOption.label}
            </StudioSuggestion.Option>
          );
        })}
      </StudioSuggestion>
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
