import type { ReactNode } from 'react';
import React, { useState } from 'react';
import { useAppVersionQuery } from 'app-shared/hooks/queries';
import {
  StudioAlert,
  StudioDialog,
  StudioHeading,
  StudioLink,
  StudioParagraph,
  StudioTable,
} from '@studio/components';
import { useTranslation } from 'react-i18next';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useLocalStorage } from '@studio/components-legacy';
import {
  MAXIMUM_SUPPORTED_BACKEND_VERSION,
  MAXIMUM_SUPPORTED_FRONTEND_VERSION,
  MINIMUM_SUPPORTED_BACKEND_VERSION,
  MINIMUM_SUPPORTED_FRONTEND_VERSION,
} from 'app-shared/constants';
import { altinnDocsUrl } from 'app-shared/ext-urls';
import classes from './VersionDialog.module.css';
import cn from 'classnames';
import type { AppVersion } from 'app-shared/types/AppVersion';
import { RemindChoiceDialog } from 'app-shared/components/RemindChoiceDialog/RemindChoiceDialog';
import { isBelowSupportedVersion } from 'app-shared/utils/compareFunctions';

export const VersionDialog = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { data } = useAppVersionQuery(org, app);
  const { t } = useTranslation();

  if (!data) {
    return;
  }

  const isUnsupported =
    isBelowSupportedVersion(data.frontendVersion, MINIMUM_SUPPORTED_FRONTEND_VERSION) ||
    isBelowSupportedVersion(data.backendVersion, MINIMUM_SUPPORTED_BACKEND_VERSION);

  if (isUnsupported) {
    return (
      <Dialog
        title={t('version_dialog.unsupported_version_title')}
        frontendVersion={data.frontendVersion}
        backendVersion={data.backendVersion}
      >
        {t('version_dialog.unsupported_version_content')}
      </Dialog>
    );
  }

  const isOutdated =
    isBelowSupportedVersion(data.frontendVersion, MAXIMUM_SUPPORTED_FRONTEND_VERSION) ||
    isBelowSupportedVersion(data.backendVersion, MAXIMUM_SUPPORTED_BACKEND_VERSION);

  if (isOutdated) {
    return (
      <Dialog
        title={t('version_dialog.outdated_version_title')}
        frontendVersion={data.frontendVersion}
        backendVersion={data.backendVersion}
      >
        {t('version_dialog.outdated_version_title_content')
          .split('\n')
          .map((tr) => (
            <StudioParagraph key={tr}>{tr}</StudioParagraph>
          ))}
      </Dialog>
    );
  }

  return;
};

type DialogProps = {
  title: string;
  children: ReactNode;
  frontendVersion: string;
  backendVersion: string;
  className?: string;
};

const Dialog = ({ title, children, frontendVersion, backendVersion, className }: DialogProps) => {
  const { org, app } = useStudioEnvironmentParams();
  const { t } = useTranslation();

  const [skippedUpdateVersions, setSkippedUpdateVersions] = useLocalStorage<AppVersion>(
    `studio:skippedUpdateVersions:${org}:${app}`,
  );
  var hideVersionDialog =
    skippedUpdateVersions?.frontendVersion === frontendVersion &&
    skippedUpdateVersions?.backendVersion === backendVersion;

  const [opened, setOpened] = useState(!hideVersionDialog);

  const handleCloseDialog = (permanentlyDismiss: boolean) => {
    if (permanentlyDismiss) {
      setSkippedUpdateVersions({
        frontendVersion,
        backendVersion,
      });
    }
    setOpened(false);
  };

  if (hideVersionDialog) {
    return;
  }

  const isFrontendVersionOutdated = isBelowSupportedVersion(
    frontendVersion,
    MAXIMUM_SUPPORTED_FRONTEND_VERSION,
  );
  const isBackendVersionOutdated = isBelowSupportedVersion(
    backendVersion,
    MAXIMUM_SUPPORTED_BACKEND_VERSION,
  );

  return (
    <StudioDialog data-color='warning' open={opened} className={classes.dialog} closeButton={false}>
      <RemindChoiceDialog closeDialog={handleCloseDialog} />
      <StudioDialog.Block className={classes.text}>
        <StudioAlert data-color='warning' className={cn(classes.alert, className)}>
          <StudioHeading level={2}>{title}</StudioHeading>
          {children}
          <StudioTable>
            <StudioTable.Head>
              <StudioTable.Row>
                <StudioTable.HeaderCell></StudioTable.HeaderCell>
                <StudioTable.HeaderCell>
                  {t('version_dialog.current_version')}
                </StudioTable.HeaderCell>
                <StudioTable.HeaderCell>
                  {t('version_dialog.latest_version')}
                </StudioTable.HeaderCell>
                <StudioTable.HeaderCell></StudioTable.HeaderCell>
              </StudioTable.Row>
            </StudioTable.Head>
            <StudioTable.Body>
              {isFrontendVersionOutdated && (
                <StudioTable.Row>
                  <StudioTable.HeaderCell>Frontend</StudioTable.HeaderCell>
                  <StudioTable.Cell>
                    {frontendVersion ? `v${frontendVersion}` : t('version_dialog.unknown')}
                  </StudioTable.Cell>
                  <StudioTable.Cell>v{MAXIMUM_SUPPORTED_FRONTEND_VERSION}</StudioTable.Cell>
                  <StudioTable.Cell>
                    <StudioLink
                      className={classes.linkButton}
                      href={altinnDocsUrl({
                        relativeUrl: 'community/changelog/app-frontend/',
                      })}
                    >
                      {t('version_dialog.update_frontend', {
                        latestVersion: MAXIMUM_SUPPORTED_FRONTEND_VERSION,
                      })}
                    </StudioLink>
                  </StudioTable.Cell>
                </StudioTable.Row>
              )}
              {isBackendVersionOutdated && (
                <StudioTable.Row>
                  <StudioTable.HeaderCell>Backend</StudioTable.HeaderCell>
                  <StudioTable.Cell>
                    {backendVersion ? `v${backendVersion}` : t('version_dialog.unknown')}
                  </StudioTable.Cell>
                  <StudioTable.Cell>v{MAXIMUM_SUPPORTED_BACKEND_VERSION}</StudioTable.Cell>
                  <StudioTable.Cell>
                    <StudioLink
                      className={classes.linkButton}
                      href={altinnDocsUrl({
                        relativeUrl: 'community/changelog/app-nuget/',
                      })}
                    >
                      {t('version_dialog.update_backend', {
                        latestVersion: MAXIMUM_SUPPORTED_BACKEND_VERSION,
                      })}
                    </StudioLink>
                  </StudioTable.Cell>
                </StudioTable.Row>
              )}
            </StudioTable.Body>
          </StudioTable>
        </StudioAlert>
      </StudioDialog.Block>
    </StudioDialog>
  );
};
