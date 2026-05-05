import type { ReactNode } from 'react';
import { useState } from 'react';
import { useAppVersionQuery } from 'app-shared/hooks/queries';
import {
  StudioAlert,
  StudioDialog,
  StudioHeading,
  StudioParagraph,
  StudioTable,
} from '@studio/components';
import { useTranslation } from 'react-i18next';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useLocalStorage } from '@studio/components-legacy';
import { altinnDocsUrl } from 'app-shared/ext-urls';
import classes from './VersionDialog.module.css';
import cn from 'classnames';
import type { AppVersion } from 'app-shared/types/AppVersion';
import { RemindChoiceDialog } from 'app-shared/components/RemindChoiceDialog/RemindChoiceDialog';
import { VersionDialogTableRow } from './VersionDialogTableRow';
import { useVersionStatus, type VersionStatus } from './useVersionStatus';

export const VersionDialog = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { data } = useAppVersionQuery(org, app);
  const { t } = useTranslation();
  const versionStatus = useVersionStatus(data);

  if (!versionStatus) {
    return;
  }

  if (versionStatus.isUnsupported) {
    return (
      <Dialog
        title={t('version_dialog.unsupported_version_title')}
        frontendVersion={data.frontendVersion}
        backendVersion={data.backendVersion}
        versionStatus={versionStatus}
      >
        {t('version_dialog.unsupported_version_content')}
      </Dialog>
    );
  }

  if (versionStatus.isOutdated) {
    return (
      <Dialog
        title={t('version_dialog.outdated_version_title')}
        frontendVersion={data.frontendVersion}
        backendVersion={data.backendVersion}
        versionStatus={versionStatus}
      >
        <StudioParagraph>{t('version_dialog.outdated_version_description')}</StudioParagraph>
        <StudioParagraph>{t('version_dialog.outdated_version_recommendation')}</StudioParagraph>
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
  versionStatus: VersionStatus;
};

const Dialog = ({
  title,
  children,
  frontendVersion,
  backendVersion,
  className,
  versionStatus,
}: DialogProps) => {
  const { org, app } = useStudioEnvironmentParams();
  const { t } = useTranslation();

  const [skippedUpdateVersions, setSkippedUpdateVersions] = useLocalStorage<AppVersion>(
    `studio:skippedUpdateVersions:${org}:${app}`,
  );
  const hideVersionDialog =
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
              {versionStatus.isFrontendOutdated && (
                <VersionDialogTableRow
                  devTypeLabel={t('version_dialog.frontend')}
                  currentVersion={frontendVersion}
                  latestVersion={versionStatus.maxFrontendVersion}
                  link={{
                    href: altinnDocsUrl({
                      relativeUrl: 'community/changelog/app-frontend/',
                    }),
                    text: 'version_dialog.update_frontend',
                  }}
                />
              )}
              {versionStatus.isBackendOutdated && (
                <VersionDialogTableRow
                  devTypeLabel={t('version_dialog.backend')}
                  currentVersion={backendVersion}
                  latestVersion={versionStatus.maxBackendVersion}
                  link={{
                    href: altinnDocsUrl({
                      relativeUrl: 'community/changelog/app-nuget/',
                    }),
                    text: 'version_dialog.update_backend',
                  }}
                />
              )}
            </StudioTable.Body>
          </StudioTable>
        </StudioAlert>
      </StudioDialog.Block>
    </StudioDialog>
  );
};
