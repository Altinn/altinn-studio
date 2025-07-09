import { useInstanceEventsQuery } from 'admin/hooks/queries/useInstanceEventsQuery';
import { StudioSpinner } from '@studio/components';
import { formatDateAndTime } from 'admin/utils/formatDateAndTime';
import { StudioError } from '@studio/components-legacy';
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { InstanceEvent } from 'admin/types/InstanceEvent';

type InstanceEventsProps = {
  org: string;
  env: string;
  app: string;
  instanceId: string;
};

export const InstanceEvents = ({ org, env, app, instanceId }: InstanceEventsProps) => {
  const { data, status } = useInstanceEventsQuery(org, env, app, instanceId);
  const { t } = useTranslation();

  switch (status) {
    case 'pending':
      return <StudioSpinner aria-label={t('general.loading')} />;
    case 'error':
      return <StudioError>{t('general.page_error_title')}</StudioError>;
    case 'success':
      return <InstaneEventsWithData events={data} />;
  }
};

type InstanceEventsWithDataProps = {
  events: InstanceEvent[];
};
const InstaneEventsWithData = ({ events }: InstanceEventsWithDataProps) => {
  return events.map((entry, i) => (
    <li key={i}>
      {formatDateAndTime(entry.created)} - {entry.eventType} {entry.dataId}{' '}
      {entry.processInfo?.currentTask?.elementId} av {entry.user?.userId}
    </li>
  ));
};
