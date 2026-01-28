import React from 'react';
import { StudioSpinner, StudioError } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { StatusFilter } from './StatusFilter';
import type { ProcessTaskMetadata } from 'admin/hooks/queries/useProcessMetadataQuery';
import { useProcessMetadataQuery } from 'admin/hooks/queries/useProcessMetadataQuery';

type ProcessTaskPickerProps = {
  org: string;
  environment: string;
  app: string;
  value: string | undefined;
  setValue: (value: string | undefined) => void;
};

export const ProcessTaskFilter = ({
  org,
  environment,
  app,
  value,
  setValue,
}: ProcessTaskPickerProps) => {
  const { data, status } = useProcessMetadataQuery(org, environment, app);
  const { t } = useTranslation();

  switch (status) {
    case 'pending':
      return <StudioSpinner aria-label={t('general.loading')} />;
    case 'error':
      return <StudioError>{t('general.page_error_title')}</StudioError>;
    case 'success':
      return <ProcessTaskFilterWithData processTasks={data} value={value} setValue={setValue} />;
  }
};

type ProcessTaskPickerWithDataProps = {
  processTasks: ProcessTaskMetadata[];
  value: string | undefined;
  setValue: (value: string | undefined) => void;
};

const ProcessTaskFilterWithData = ({
  processTasks,
  value,
  setValue,
}: ProcessTaskPickerWithDataProps) => (
  <StatusFilter
    label='admin.instances.process_task'
    value={value}
    setValue={setValue}
    options={[
      { label: 'admin.instances.filter.all', value: undefined },
      ...processTasks.map((task) => ({ label: task.name ?? task.id, value: task.id })),
    ]}
  />
);
