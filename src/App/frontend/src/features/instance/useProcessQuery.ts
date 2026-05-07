import { useOptimisticallyUpdateInstance } from 'src/core/queries/instance';
import { useIsStateless } from 'src/features/applicationMetadata';
import { getUiConfig } from 'src/features/form/ui';
import { useInstanceDataQuery } from 'src/features/instance/InstanceContext';
import { TaskKeys } from 'src/routesBuilder';
import { isProcessTaskType, ProcessTaskType } from 'src/types';
import type { LooseAutocomplete } from 'src/types';
import type { IActionType, IProcess } from 'src/types/shared';

export function useProcessQuery() {
  const { data, refetch } = useInstanceDataQuery({ select: (instance) => instance.process });
  return { data, refetch };
}

export const useIsAuthorized = () => {
  const { data } = useProcessQuery();

  return (action: LooseAutocomplete<IActionType>): boolean => {
    const userAction = data?.currentTask?.userActions?.find((a) => a.id === action);
    return !!userAction?.authorized;
  };
};

/**
 * This returns the task type of the current process task, as we got it from the backend
 */
export function useTaskTypeFromBackend() {
  const { data: processData } = useProcessQuery();

  if (processData?.ended) {
    return ProcessTaskType.Archived;
  }

  const altinnTaskType = processData?.currentTask?.altinnTaskType;
  if (altinnTaskType && isProcessTaskType(altinnTaskType)) {
    return altinnTaskType;
  }

  return ProcessTaskType.Unknown;
}

/**
 * Pure classifier: resolves the ProcessTaskType of a given taskId.
 *
 * If the taskId cannot be found in processTasks, it falls back to the currentTask's
 * type when the currentTask matches the taskId provided.
 *
 * Stateless apps only have data tasks. As soon as they start creating an instance
 * from that stateless step, applicationMetadata.isStatelessApp will return false
 * and we'll proceed as normal.
 */
export function getTaskTypeById(
  processData: IProcess | undefined,
  taskId: string | undefined,
  isStateless: boolean,
  uiFolders: Record<string, unknown>,
): ProcessTaskType {
  const task =
    (processData?.processTasks?.find((t) => t.elementId === taskId) ?? processData?.currentTask?.elementId === taskId)
      ? processData?.currentTask
      : undefined;

  if (isStateless || taskId === TaskKeys.CustomReceipt || (taskId && taskId in uiFolders)) {
    return ProcessTaskType.Data;
  }

  if (taskId === TaskKeys.ProcessEnd || processData?.ended) {
    return ProcessTaskType.Archived;
  }

  if (task?.elementType === 'ServiceTask') {
    return ProcessTaskType.Service;
  }

  const altinnTaskType = task?.altinnTaskType;
  if (altinnTaskType && isProcessTaskType(altinnTaskType)) {
    return altinnTaskType;
  }

  return ProcessTaskType.Unknown;
}

/**
 * Hook wrapper for getTaskTypeById that pulls inputs from React context.
 */
export function useGetTaskTypeById() {
  const { data: processData } = useProcessQuery();
  const isStateless = useIsStateless();
  const uiFolders = getUiConfig().folders;

  return (taskId: string | undefined) => getTaskTypeById(processData, taskId, isStateless, uiFolders);
}

/**
 * Returns the actual raw task type of a given taskId.
 */
export function useGetAltinnTaskType() {
  const { data: processData } = useProcessQuery();
  return (taskId: string | undefined) => processData?.processTasks?.find((t) => t.elementId === taskId)?.altinnTaskType;
}

export function useOptimisticallyUpdateProcess() {
  const updateInstance = useOptimisticallyUpdateInstance();

  return (process: IProcess) => {
    updateInstance((oldData) => ({ ...oldData, process }));
  };
}
