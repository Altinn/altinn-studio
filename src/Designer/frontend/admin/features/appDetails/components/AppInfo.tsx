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
  env: string;
  app: string;
};

export const AppInfo = ({ org, env, app }: AppInfoProps) => {
  const { data, status } = useAppDetailsQuery(org, env, app);
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
  appDetails: { org, env, app, version, commit, createdAt, createdBy },
}: AppInfoWithDataProps) => {
  const { t } = useTranslation();

  const shortenedCommit = commit.slice(0, 7);
  const commitPath = `/repos/${org}/${app}/src/commit/${commit}`;

  return (
    <StudioCard>
      <StudioHeading data-size='sm'>{t('Informasjon om appen')}</StudioHeading>
      <div className={classes['details-wrapper']}>
        <LabelValue label={t('Miljø')}>{t(`admin.environment.${env}`)}</LabelValue>
        <LabelValue label={t('Versjon')}>{version}</LabelValue>
        <LabelValue label={t('Commit')}>
          <a href={commitPath} target='_blank' rel='noreferrer'>
            {shortenedCommit}
            <ExternalLinkIcon className={classes.external} />
          </a>
        </LabelValue>
        <LabelValue label={t('Publiseringsdato')}>{formatDateAndTime(createdAt)}</LabelValue>
        <LabelValue label={t('Publisert av')}>{createdBy}</LabelValue>
      </div>
    </StudioCard>
  );
};
