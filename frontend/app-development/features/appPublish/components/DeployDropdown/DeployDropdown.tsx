import React, { type ReactElement } from 'react';
import classes from './DeployDropdown.module.css';
import { StudioCombobox, StudioError, StudioSpinner } from '@studio/components';
import type { ImageOption } from '../ImageOption';
import { useTranslation } from 'react-i18next';
import { useAppReleasesQuery } from 'app-development/hooks/queries';
import { BuildResult } from 'app-shared/types/Build';
import { DateUtils } from '@studio/pure-functions';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { DeployPopover } from './DeployPopover';

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
    isPending: releasesIsPending,
    isError: releasesIsError,
  } = useAppReleasesQuery(org, app, { hideDefaultError: true });

  if (releasesIsPending)
    return (
      <StudioSpinner showSpinnerTitle={false} spinnerTitle={t('app_deployment.releases_loading')} />
    );

  if (releasesIsError) return <StudioError>{t('app_deployment.releases_error')}</StudioError>;

  const imageOptions: ImageOption[] = releases
    .filter((image) => image.build.result === BuildResult.succeeded)
    .map((image) => ({
      value: image.tagName,
      label: t('app_deployment.version_label', {
        tagName: image.tagName,
        createdDateTime: DateUtils.formatDateTime(image.created),
      }),
    }));

  return (
    <div className={classes.deployDropDown}>
      <StudioCombobox
        size='small'
        value={selectedImageTag && imageOptions?.length > 0 ? [selectedImageTag] : undefined}
        label={t('app_deployment.choose_version')}
        onValueChange={(selectedImageOptions: string[]) =>
          setSelectedImageTag(selectedImageOptions[0])
        }
        disabled={disabled}
      >
        <DeployComboboxOptions imageOptions={imageOptions} />
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

type DeployComboboxOptionsProps = {
  imageOptions: ImageOption[];
};
const DeployComboboxOptions = ({ imageOptions }: DeployComboboxOptionsProps): ReactElement[] => {
  return imageOptions.map((imageOption: ImageOption) => {
    return (
      <StudioCombobox.Option key={imageOption.value} value={imageOption.value}>
        {imageOption.label}
      </StudioCombobox.Option>
    );
  });
};
