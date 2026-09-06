import { useOptimisticallyUpdateInstance } from 'src/core/queries/instance';
import { useIsStateless } from 'src/features/applicationMetadata';
import { getUiConfig } from 'src/features/form/ui';
import { useInstanceDataQuery } from 'src/features/instance/InstanceContext';
import { TaskKeys } from 'src/routesBuilder';
import { isProcessTaskType, ProcessTaskType } from 'src/types';
import { ELEMENT_TYPE } from 'src/types/shared';
import type { LooseAutocomplete } from 'src/types';
import type { IActionType, IProcess, IProcessWorkflow } from 'src/types/shared';

export function useProcessQuery() {
  const { data, refetch } = useInstanceDataQuery({ select: (instance) => instance.process });
  return { data, refetch };
}

/**
 * The live workflow-engine annotation on the current process state, or undefined when the backend
 * did not emit one (treated as `idle` by consumers).
 */
export function useProcessWorkflow(): IProcessWorkflow | undefined {
  const { data } = useProcessQuery();
  return data?.workflow;
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
 * We first look for the taskId in processTasks (the full list of tasks in the process, which may
 * include tasks other than the current one - e.g. a later PDF service task, or the parent data task
 * of a subform PDF preview). If it isn't found there, we fall back to currentTask when it matches the
 * taskId provided. Some backends/mocks only put elementType on currentTask, so as a defensive measure
 * we also fall back to currentTask's elementType/altinnTaskType when the list entry is missing them.
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
  const fromList = processData?.processTasks?.find((t) => t.elementId === taskId);
  const fromCurrent = processData?.currentTask?.elementId === taskId ? processData?.currentTask : undefined;
  const task = fromList ?? fromCurrent;

  if (isStateless || taskId === TaskKeys.CustomReceipt || (taskId && taskId in uiFolders)) {
    return ProcessTaskType.Data;
  }

  if (taskId === TaskKeys.ProcessEnd || processData?.ended) {
    return ProcessTaskType.Archived;
  }

  const elementType = task?.elementType ?? fromCurrent?.elementType;
  if (elementType === ELEMENT_TYPE.SERVICE_TASK) {
    return ProcessTaskType.Service;
  }

  const altinnTaskType = task?.altinnTaskType ?? fromCurrent?.altinnTaskType;
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
