import type { ChangeEvent } from 'react';
import React, { useState } from 'react';
import { StudioSpinner, StudioSelect, StudioError } from '@studio/components';
import { useAppProcessTasks } from 'admin/hooks/queries/useAppProcessTasks';
import { useTranslation } from 'react-i18next';
import type { ProcessTask } from 'admin/types/ProcessTask';
import { useQueryParamState } from 'admin/hooks/useQueryParamState';
import { useEffectEventPolyfill } from 'admin/hooks/useEffectEventPolyfill';

type ProcessTaskPickerProps = {
  org: string;
  env: string;
  app: string;
  state: ProcessTaskPickerState;
};

export const ProcessTaskPicker = ({ org, env, app, state }: ProcessTaskPickerProps) => {
  const { data, status } = useAppProcessTasks(org, env, app);
  const { t } = useTranslation();

  switch (status) {
    case 'pending':
      return <StudioSpinner aria-label={t('general.loading')} />;
    case 'error':
      return <StudioError>{t('general.page_error_title')}</StudioError>;
    case 'success':
      return <ProcessTaskPickerWithData processTasks={data} state={state} />;
  }
};

type ProcessTaskPickerData = {
  currentTask: string | undefined;
  isComplete: true | undefined;
};

type ProcessTaskPickerState = ProcessTaskPickerData & {
  setProcessTaskPickerState: (state: ProcessTaskPickerData) => void;
};

export const useProcessTaskPicker: () => ProcessTaskPickerState = () => {
  const [processTaskPickerData, setProcessTaskPickerState] =
    useQueryParamState<ProcessTaskPickerData>({
      currentTask: undefined,
      isComplete: undefined,
    });

  return { ...processTaskPickerData, setProcessTaskPickerState };
};

type ProcessTaskPickerWithDataProps = {
  processTasks: ProcessTask[];
  state: ProcessTaskPickerState;
};

const ProcessTaskPickerWithData = ({ processTasks, state }: ProcessTaskPickerWithDataProps) => {
  const { t } = useTranslation();

  function handleChange(e: ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    switch (value) {
      case '__all__':
        state.setProcessTaskPickerState({ currentTask: undefined, isComplete: undefined });
        break;
      case '__ended__':
        state.setProcessTaskPickerState({ currentTask: undefined, isComplete: true });
        break;
      default:
        state.setProcessTaskPickerState({ currentTask: value, isComplete: undefined });
    }
  }

  return (
    <StudioSelect
      label={t('Prosessteg')}
      value={state.currentTask ?? (state.isComplete ? '__ended__' : '__all__')}
      onChange={handleChange}
    >
      <StudioSelect.Option value={'__all__'}>{t('Alle')}</StudioSelect.Option>
      {processTasks.map((task) => (
        <StudioSelect.Option key={task.id} value={task.id}>
          {task.name ?? task.id}
        </StudioSelect.Option>
      ))}
      <StudioSelect.Option value={'__ended__'}>{t('Avsluttet')}</StudioSelect.Option>
    </StudioSelect>
  );
};
