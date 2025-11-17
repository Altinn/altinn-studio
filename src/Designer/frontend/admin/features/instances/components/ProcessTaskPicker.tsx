import React from 'react';
import { StudioSpinner, StudioError } from '@studio/components';
import { useAppProcessTasks } from 'admin/hooks/queries/useAppProcessTasks';
import { useTranslation } from 'react-i18next';
import type { ProcessTask } from 'admin/types/ProcessTask';
import { StatusFilter } from './StatusFilter';

type ProcessTaskPickerProps = {
  org: string;
  env: string;
  app: string;
  value: string | undefined;
  setValue: (value: string | undefined) => void;
};

export const ProcessTaskPicker = ({ org, env, app, value, setValue }: ProcessTaskPickerProps) => {
  const { data, status } = useAppProcessTasks(org, env, app);
  const { t } = useTranslation();

  switch (status) {
    case 'pending':
      return <StudioSpinner aria-label={t('general.loading')} />;
    case 'error':
      return <StudioError>{t('general.page_error_title')}</StudioError>;
    case 'success':
      return <ProcessTaskPickerWithData processTasks={data} value={value} setValue={setValue} />;
  }
};

type ProcessTaskPickerWithDataProps = {
  processTasks: ProcessTask[];
  value: string | undefined;
  setValue: (value: string | undefined) => void;
};

const ProcessTaskPickerWithData = ({
  processTasks,
  value,
  setValue,
}: ProcessTaskPickerWithDataProps) => (
  <StatusFilter
    label='Prosessteg'
    value={value}
    setValue={setValue}
    options={[
      { label: 'Alle', value: undefined },
      ...processTasks.map((task) => ({ label: task.name ?? task.id, value: task.id })),
    ]}
  />
);
