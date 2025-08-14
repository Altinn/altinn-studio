import React from 'react';
import { StudioSpinner, StudioSelect } from '@studio/components';
import { StudioError } from '@studio/components-legacy';
import { useAppProcessTasks } from 'admin/hooks/queries/useAppProcessTasks';
import { useTranslation } from 'react-i18next';
import type { ProcessTask } from 'admin/types/ProcessTask';

type ProcessTaskPickerProps = {
  org: string;
  env: string;
  app: string;
  value: string | null;
  onChange: (value: string) => void;
};

export const ProcessTaskPicker = ({ org, env, app, value, onChange }: ProcessTaskPickerProps) => {
  const { data, status } = useAppProcessTasks(org, env, app);
  const { t } = useTranslation();

  switch (status) {
    case 'pending':
      return <StudioSpinner aria-label={t('general.loading')} />;
    case 'error':
      return <StudioError>{t('general.page_error_title')}</StudioError>;
    case 'success':
      return <ProcessTaskPickerWithData processTasks={data} value={value} onChange={onChange} />;
  }
};

type ProcessTaskPickerWithDataProps = {
  processTasks: ProcessTask[];
  value: string | null;
  onChange: (value: string) => void;
};

const ProcessTaskPickerWithData = ({
  processTasks,
  value,
  onChange,
}: ProcessTaskPickerWithDataProps) => {
  const { t } = useTranslation();

  return (
    <StudioSelect
      label={t('Prosessteg')}
      value={value}
      onChange={(e) => onChange(e.target.value || null)}
    >
      <StudioSelect.Option value={''}>{t('Alle')}</StudioSelect.Option>
      {processTasks.map((task) => (
        <StudioSelect.Option key={task.id} value={task.id}>
          {task.name}
        </StudioSelect.Option>
      ))}
    </StudioSelect>
  );
};
