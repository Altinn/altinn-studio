import { useProcessHistoryQuery } from '../../../hooks/queries/useProcessHistoryQuery';
import { StudioSpinner } from 'libs/studio-components/src';
import { formatDateAndTime } from '../../../utils/formatDateAndTime';
import { StudioError } from 'libs/studio-components-legacy/src';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { type ProcessHistoryItem } from '../../../types/ProcessHistory';

type ProcessHistoryProps = {
  org: string;
  env: string;
  app: string;
  instanceId: string;
};

export const ProcessHistory = ({ org, env, app, instanceId }: ProcessHistoryProps) => {
  const { data, status } = useProcessHistoryQuery(org, env, app, instanceId);
  const { t } = useTranslation();

  switch (status) {
    case 'pending':
      return <StudioSpinner aria-label={t('general.loading')} />;
    case 'error':
      return <StudioError>{t('general.page_error_title')}</StudioError>;
    case 'success':
      return <ProcessHistoryWithData history={data} />;
  }
};

type ProcessHistoryWithDataProps = {
  history: ProcessHistoryItem[];
};
const ProcessHistoryWithData = ({ history }: ProcessHistoryWithDataProps) => {
  return history.map((entry, i) => (
    <li key={i}>
      {formatDateAndTime(entry.occured)} - {entry.eventType} {entry.elementId} av{' '}
      {entry.performedBy}
    </li>
  ));
};
