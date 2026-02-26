import { StudioSpinner, StudioError, StudioCard, StudioHeading } from '@studio/components';
import { useAppDetailsQuery } from 'admin/hooks/queries/useAppDetailsQuery';
import type { PublishedApplicationDetails } from 'admin/types/PublishedApplicationDetails';
import { useTranslation } from 'react-i18next';
import { ExternalLinkIcon } from '@studio/icons';

import classes from './AppInfo.module.css';
import { formatDateAndTime } from 'admin/utils/formatDateAndTime';
import { LabelValue } from 'admin/components/LabelValue/LabelValue';

type AppInfoProps = {
  org: string;
  environment: string;
  app: string;
};

export const AppInfo = ({ org, environment, app }: AppInfoProps) => {
  const { data, status } = useAppDetailsQuery(org, environment, app);
  const { t } = useTranslation();

  switch (status) {
    case 'pending':
      return <StudioSpinner aria-label={t('general.loading')} />;
    case 'error':
      return <StudioError>{t('general.page_error_title')}</StudioError>;
    case 'success':
      return <AppInfoWithData appDetails={data} />;
  }
};

type AppInfoWithDataProps = {
  appDetails: PublishedApplicationDetails;
};

const AppInfoWithData = ({
  appDetails: {
    org,
    env: environment,
    app,
    version,
    appLibVersion,
    appFrontendVersion,
    commit,
    createdAt,
    createdBy,
  },
}: AppInfoWithDataProps) => {
  const { t } = useTranslation();

  const shortenedCommit = commit.slice(0, 7);
  const commitPath = `/repos/${org}/${app}/src/commit/${commit}`;

  return (
    <StudioCard>
      <StudioHeading data-size='sm'>{t('admin.app.info.title')}</StudioHeading>
      <div className={classes['details-wrapper']}>
        <LabelValue label={t('admin.environment')}>
          {t('admin.environment.name', { environment })}
        </LabelValue>
        <LabelValue label={t('admin.app.info.app_version')}>{version}</LabelValue>
        {appLibVersion && (
          <LabelValue label={t('admin.app.info.backend_version')}>{appLibVersion}</LabelValue>
        )}
        {appFrontendVersion && (
          <LabelValue label={t('admin.app.info.frontend_version')}>{appFrontendVersion}</LabelValue>
        )}
        <LabelValue label={t('admin.app.info.commit')}>
          <a href={commitPath} target='_blank' rel='noreferrer'>
            {shortenedCommit}
            <ExternalLinkIcon className={classes.external} />
          </a>
        </LabelValue>
        <LabelValue label={t('admin.app.info.publish_date')}>
          {formatDateAndTime(createdAt)}
        </LabelValue>
        <LabelValue label={t('admin.app.info.published_by')}>{createdBy}</LabelValue>
      </div>
    </StudioCard>
  );
};
