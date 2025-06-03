import type { ReactNode } from 'react';
import React from 'react';
import { useAppVersionQuery } from 'app-shared/hooks/queries';
import { StudioAlert, StudioHeading, StudioLink, StudioTable } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import {
  MAXIMUM_SUPPORTED_BACKEND_VERSION,
  MAXIMUM_SUPPORTED_FRONTEND_VERSION,
} from 'app-shared/constants';
import { altinnDocsUrl } from 'app-shared/ext-urls';
import classes from './VersionAlert.module.css';
import cn from 'classnames';
import { isBelowSupportedVersion } from './utils';
import { ExternalLinkIcon } from '@studio/icons';

export type VersionAlertProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

export const VersionAlert = ({ title, children, className }: VersionAlertProps) => {
  const { org, app } = useStudioEnvironmentParams();
  const { data } = useAppVersionQuery(org, app);
  const { t } = useTranslation();

  const isFrontendOutdated = isBelowSupportedVersion(
    data?.frontendVersion,
    MAXIMUM_SUPPORTED_FRONTEND_VERSION,
  );
  const isBackendOutdated = isBelowSupportedVersion(
    data?.backendVersion,
    MAXIMUM_SUPPORTED_BACKEND_VERSION,
  );

  return (
    <StudioAlert data-color='warning' className={cn(classes.alert, className)}>
      <StudioHeading level={2}>{title}</StudioHeading>
      {children}
      <StudioTable>
        <StudioTable.Head>
          <StudioTable.Row>
            <StudioTable.HeaderCell></StudioTable.HeaderCell>
            <StudioTable.HeaderCell>{t('version_alerts.current_version')}</StudioTable.HeaderCell>
            <StudioTable.HeaderCell>{t('version_alerts.latest_version')}</StudioTable.HeaderCell>
            <StudioTable.HeaderCell></StudioTable.HeaderCell>
          </StudioTable.Row>
        </StudioTable.Head>
        <StudioTable.Body>
          {isFrontendOutdated && (
            <StudioTable.Row>
              <StudioTable.HeaderCell>Frontend</StudioTable.HeaderCell>
              <StudioTable.Cell>v{data.frontendVersion}</StudioTable.Cell>
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
              <StudioTable.Cell>v{data.backendVersion}</StudioTable.Cell>
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
  );
};
