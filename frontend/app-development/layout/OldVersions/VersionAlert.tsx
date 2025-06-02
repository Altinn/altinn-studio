import type { ReactNode } from 'react';
import React from 'react';
import { useAppVersionQuery } from 'app-shared/hooks/queries';
import { StudioAlert, StudioHeading, StudioLink, StudioTable } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { LATEST_BACKEND_VERSION, LATEST_FRONTEND_VERSION } from 'app-shared/constants';
import { altinnDocsUrl } from 'app-shared/ext-urls';
import classes from './VersionAlert.module.css';
import cn from 'classnames';

export type VersionAlertProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

export const VersionAlert = ({ title, children, className }: VersionAlertProps) => {
  const { org, app } = useStudioEnvironmentParams();
  const { data } = useAppVersionQuery(org, app);
  const { t } = useTranslation();

  const isFrontendOutdated =
    data?.frontendVersion?.slice(0, LATEST_FRONTEND_VERSION.length) < LATEST_FRONTEND_VERSION;
  const isBackendOutdated =
    data?.backendVersion?.slice(0, LATEST_BACKEND_VERSION.length) < LATEST_BACKEND_VERSION;

  return (
    <StudioAlert data-color='warning' className={cn(classes.alert, className)}>
      <StudioHeading level={2}>{title}</StudioHeading>
      {children}
      <StudioTable>
        <StudioTable.Head>
          <StudioTable.Row>
            <StudioTable.HeaderCell></StudioTable.HeaderCell>
            <StudioTable.HeaderCell>{t('versions.current_version')}</StudioTable.HeaderCell>
            <StudioTable.HeaderCell>{t('versions.latest_version')}</StudioTable.HeaderCell>
            <StudioTable.HeaderCell></StudioTable.HeaderCell>
          </StudioTable.Row>
        </StudioTable.Head>
        <StudioTable.Body>
          {isFrontendOutdated && (
            <StudioTable.Row>
              <StudioTable.HeaderCell>Frontend</StudioTable.HeaderCell>
              <StudioTable.Cell>v{data.frontendVersion}</StudioTable.Cell>
              <StudioTable.Cell>v{LATEST_FRONTEND_VERSION}</StudioTable.Cell>
              <StudioTable.Cell>
                {isFrontendOutdated && (
                  <StudioLink
                    className={classes.linkButton}
                    href={altinnDocsUrl({
                      relativeUrl: 'community/changelog/app-frontend/v4/migrating-from-v3/',
                    })}
                  >
                    {t('versions.update_frontend', {
                      latestVersion: LATEST_FRONTEND_VERSION,
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
              <StudioTable.Cell>v{LATEST_BACKEND_VERSION}</StudioTable.Cell>
              <StudioTable.Cell>
        {isBackendOutdated && (
          <StudioLink
            className={classes.linkButton}
            href={altinnDocsUrl({
              relativeUrl: 'community/changelog/app-nuget/v8/migrating-from-v7/',
            })}
          >
                    {t('versions.update_backend', {
              latestVersion: LATEST_BACKEND_VERSION,
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
