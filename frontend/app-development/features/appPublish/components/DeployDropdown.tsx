import React, { useState } from 'react';
import classes from './DeployDropdown.module.css';
import { AltinnConfirmDialog } from 'app-shared/components';
import { StudioButton, StudioSpinner } from '@studio/components';
import { Alert, Combobox, Spinner } from '@digdir/design-system-react';
import type { ImageOption } from './ImageOption';
import { useTranslation } from 'react-i18next';
import { useAppReleasesQuery } from 'app-development/hooks/queries';
import { BuildResult } from 'app-shared/types/Build';
import { formatDateTime } from 'app-shared/pure/date-format';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';

export interface DeployDropdownProps {
  appDeployedVersion: string;
  disabled: boolean;
  setSelectedImageTag: (tag: string) => void;
  selectedImageTag: string;
  startDeploy: () => void;
  isPending: boolean;
}

export const DeployDropdown = ({
  appDeployedVersion,
  selectedImageTag,
  setSelectedImageTag,
  disabled,
  startDeploy,
  isPending,
}: DeployDropdownProps) => {
  const { org, app } = useStudioUrlParams();
  const [isConfirmDeployDialogOpen, setIsConfirmDeployDialogOpen] = useState<boolean>();
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

  if (releasesIsError) return <Alert severity='danger'>{t('app_deployment.releases_error')}</Alert>;

  const imageOptions: ImageOption[] = releases
    .filter((image) => image.build.result === BuildResult.succeeded)
    .map((image) => ({
      value: image.tagName,
      label: `Version ${image.tagName} (${formatDateTime(image.created)})`,
    }));

  if (!imageOptions.length) return null;

  return (
    <div className={classes.deployDropDown}>
      <div>
        <Combobox
          size='small'
          value={selectedImageTag ? [selectedImageTag] : undefined}
          label={t('app_deployment.choose_version')}
          onValueChange={(selectedImageOptions: string[]) =>
            setSelectedImageTag(selectedImageOptions[0])
          }
          disabled={disabled}
        >
          {imageOptions.map((imageOption) => {
            return (
              <Combobox.Option key={imageOption.value} value={imageOption.value}>
                {imageOption.label}
              </Combobox.Option>
            );
          })}
        </Combobox>
      </div>
      <div className={classes.deployButton}>
        <AltinnConfirmDialog
          open={isConfirmDeployDialogOpen}
          confirmColor='first'
          onConfirm={startDeploy}
          onClose={() => setIsConfirmDeployDialogOpen(false)}
          placement='right'
          trigger={
            <StudioButton
              disabled={!selectedImageTag || disabled}
              onClick={() => setIsConfirmDeployDialogOpen((prevState) => !prevState)}
              size='small'
            >
              {isPending && (
                <Spinner
                  variant='interaction'
                  title=''
                  size='xsmall'
                  data-testid='spinner-test-id'
                />
              )}
              {t('app_deployment.btn_deploy_new_version')}
            </StudioButton>
          }
        >
          <p>
            {appDeployedVersion
              ? t('app_deployment.deploy_confirmation', {
                  selectedImageTag,
                  appDeployedVersion,
                })
              : t('app_deployment.deploy_confirmation_short', { selectedImageTag })}
          </p>
        </AltinnConfirmDialog>
      </div>
    </div>
  );
};
