import { useEffect } from 'react';

import { useTaskOverrides } from 'src/core/contexts/TaskOverrides';
import { useProcessQuery, useTaskTypeFromBackend } from 'src/features/instance/useProcessQuery';
import { useLanguage } from 'src/features/language/useLanguage';
import { useNavigationParam } from 'src/hooks/navigation';
import { ProcessTaskType } from 'src/types';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { NodeValidationProps } from 'src/layout/layout';

type Props = NodeValidationProps<'SigningActions' | 'SigningDocumentList' | 'SigneeList'>;

export function ValidateSigningTaskType(props: Props) {
  const currentTaskType = useTaskTypeFromBackend();
  const isInCurrentTask = useIsInCurrentTask();
  const addError = NodesInternal.useAddError();
  const { langAsString } = useLanguage();
  const error = langAsString('signing.wrong_task_error', [props.intermediateItem.type]);

  useEffect(() => {
    if (currentTaskType !== ProcessTaskType.Signing && isInCurrentTask) {
      addError(error, props.intermediateItem.id, 'node');
      window.logErrorOnce(`Validation error for '${props.intermediateItem.id}': ${error}`);
    }
  }, [addError, error, isInCurrentTask, props.intermediateItem.id, props.intermediateItem.type, currentTaskType]);

  return null;
}

function useIsInCurrentTask() {
  const overriddenTaskId = useTaskOverrides()?.taskId;
  const processTaskId = useProcessQuery().data?.currentTask?.elementId;
  const urlTaskId = useNavigationParam('taskId');

  return (overriddenTaskId ?? urlTaskId) === processTaskId && processTaskId !== undefined;
}
