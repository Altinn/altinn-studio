import { useEffect } from 'react';

import { useTaskOverrides } from 'src/core/contexts/TaskOverrides';
import { FormStore } from 'src/features/form/FormContext';
import { useProcessQuery, useTaskTypeFromBackend } from 'src/features/instance/useProcessQuery';
import { useLanguage } from 'src/features/language/useLanguage';
import { useNavigationParam } from 'src/hooks/navigation';
import { ProcessTaskType } from 'src/types';
import type { ComponentLayoutValidationProps } from 'src/layout/layout';

type Props = ComponentLayoutValidationProps<'SigningActions' | 'SigningDocumentList' | 'SigneeList'>;

export function ValidateSigningTaskType(props: Props) {
  const currentTaskType = useTaskTypeFromBackend();
  const isInCurrentTask = useIsInCurrentTask();
  const addError = FormStore.layoutDiagnostics.useAddError();
  const { langAsString } = useLanguage();
  const error = langAsString('signing.wrong_task_error', [props.externalItem.type]);

  useEffect(() => {
    if (currentTaskType !== ProcessTaskType.Signing && isInCurrentTask) {
      addError(error, props.externalItem.id, 'node');
      window.logErrorOnce(`Validation error for '${props.externalItem.id}': ${error}`);
    }
  }, [addError, error, isInCurrentTask, props.externalItem.id, props.externalItem.type, currentTaskType]);

  return null;
}

function useIsInCurrentTask() {
  const overriddenTaskId = useTaskOverrides()?.taskId;
  const processTaskId = useProcessQuery().data?.currentTask?.elementId;
  const urlTaskId = useNavigationParam('taskId');

  return (overriddenTaskId ?? urlTaskId) === processTaskId && processTaskId !== undefined;
}
