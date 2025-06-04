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
import { isBelowSupportedVersion } from './utils';
import { VersionDialogRemindChoiceDialog } from './VersionDialogRemindChoiceDialog';

export const VersionDialog = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { data } = useAppVersionQuery(org, app);
  const { t } = useTranslation();

  const isFrontendUnsupported = isBelowSupportedVersion(
    data?.frontendVersion,
    MINIMUM_SUPPORTED_FRONTEND_VERSION,
  );
  const isBackendUnsupported = isBelowSupportedVersion(
    data?.backendVersion,
    MINIMUM_SUPPORTED_BACKEND_VERSION,
  );

  if (isFrontendUnsupported || isBackendUnsupported) {
    return (
      <Dialog title={t('version_alerts.unsupported_version_title')}>
        {t('version_alerts.unsupported_version_content')}
      </Dialog>
    );
  }

  const isFrontendOutdated = isBelowSupportedVersion(
    data?.frontendVersion,
    MAXIMUM_SUPPORTED_FRONTEND_VERSION,
  );
  const isBackendOutdated = isBelowSupportedVersion(
    data?.backendVersion,
    MAXIMUM_SUPPORTED_BACKEND_VERSION,
  );

  if (isFrontendOutdated || isBackendOutdated) {
    return (
      <Dialog title={t('version_alerts.outdated_version_title')}>
        {t('version_alerts.outdated_version_title_content')
          .split('\n')
          .map((tr) => (
            <StudioParagraph key={tr}>{tr}</StudioParagraph>
          ))}
      </Dialog>
    );
  }

  return null;
};

type DialogProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

const Dialog = ({ title, children, className }: DialogProps) => {
  const { org, app } = useStudioEnvironmentParams();
  const { data } = useAppVersionQuery(org, app);
  const { t } = useTranslation();

  const [hideVersionDialog, setHideVersionDialog] = useLocalStorage(
    `studio:hideVersionDialog:${org}:${app}`,
    false,
  );
  const [opened, setOpened] = useState(!hideVersionDialog);

  if (hideVersionDialog) {
    return;
  }

  const isFrontendOutdated = isBelowSupportedVersion(
    data?.frontendVersion,
    MAXIMUM_SUPPORTED_FRONTEND_VERSION,
  );
  const isBackendOutdated = isBelowSupportedVersion(
    data?.backendVersion,
    MAXIMUM_SUPPORTED_BACKEND_VERSION,
  );

  return (
    <StudioDialog data-color='warning' open={opened} className={classes.dialog} closeButton={false}>
      <VersionDialogRemindChoiceDialog
        closeDialog={() => setOpened(false)}
        closeDialogPermanently={() => setHideVersionDialog(true)}
      />
      <StudioDialog.Block className={classes.text}>
        <StudioAlert data-color='warning' className={cn(classes.alert, className)}>
          <StudioHeading level={2}>{title}</StudioHeading>
          {children}
          <StudioTable>
            <StudioTable.Head>
              <StudioTable.Row>
                <StudioTable.HeaderCell></StudioTable.HeaderCell>
                <StudioTable.HeaderCell>
                  {t('version_alerts.current_version')}
                </StudioTable.HeaderCell>
                <StudioTable.HeaderCell>
                  {t('version_alerts.latest_version')}
                </StudioTable.HeaderCell>
                <StudioTable.HeaderCell></StudioTable.HeaderCell>
              </StudioTable.Row>
            </StudioTable.Head>
            <StudioTable.Body>
              {isFrontendOutdated && (
                <StudioTable.Row>
                  <StudioTable.HeaderCell>Frontend</StudioTable.HeaderCell>
                  <StudioTable.Cell>
                    {data?.frontendVersion
                      ? `v${data?.frontendVersion}`
                      : t('version_alerts.unknown')}
                  </StudioTable.Cell>
                  <StudioTable.Cell>v{MAXIMUM_SUPPORTED_FRONTEND_VERSION}</StudioTable.Cell>
                  <StudioTable.Cell>
                    {isFrontendOutdated && (
                      <StudioLink
                        className={classes.linkButton}
                        href={altinnDocsUrl({
                          relativeUrl: 'community/changelog/app-frontend/v4/migrating-from-v3/',
                        })}
                      >
                        {t('version_alerts.update_frontend', {
                          latestVersion: MAXIMUM_SUPPORTED_FRONTEND_VERSION,
                        })}
                      </StudioLink>
                    )}
                  </StudioTable.Cell>
                </StudioTable.Row>
              )}
              {isBackendOutdated && (
                <StudioTable.Row>
                  <StudioTable.HeaderCell>Backend</StudioTable.HeaderCell>
                  <StudioTable.Cell>
                    {data?.backendVersion
                      ? `v${data?.backendVersion}`
                      : t('version_alerts.unknown')}
                  </StudioTable.Cell>
                  <StudioTable.Cell>v{MAXIMUM_SUPPORTED_BACKEND_VERSION}</StudioTable.Cell>
                  <StudioTable.Cell>
                    {isBackendOutdated && (
                      <StudioLink
                        className={classes.linkButton}
                        href={altinnDocsUrl({
                          relativeUrl: 'community/changelog/app-nuget/v8/migrating-from-v7/',
                        })}
                      >
                        {t('version_alerts.update_backend', {
                          latestVersion: MAXIMUM_SUPPORTED_BACKEND_VERSION,
                        })}
                      </StudioLink>
                    )}
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
