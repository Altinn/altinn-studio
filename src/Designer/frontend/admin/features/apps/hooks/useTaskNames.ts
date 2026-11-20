import { createContext, useContext, useMemo } from 'react';
import { useProcessMetadataQuery } from 'admin/features/apps/hooks/queries/useProcessMetadataQuery';

/** What a process element is called: its name in the app's process, or its id when it has none. */
export type TaskNameOf = (elementId: string) => string;

const byId: TaskNameOf = (elementId) => elementId;

/**
 * The names the app's process gives its tasks, by element id. The engine knows elements only by
 * id, and a service owner knows them by name. Until the process has loaded, and for an element
 * without a name, such as an end event, the id is all there is.
 */
export const useTaskNames = (org: string, env: string, app: string): TaskNameOf => {
  const { data } = useProcessMetadataQuery(org, env, app);
  return useMemo(() => {
    const names = new Map(
      (Array.isArray(data) ? data : [])
        .filter((task) => task.name)
        .map((task) => [task.id, task.name as string]),
    );
    return names.size ? (elementId) => names.get(elementId) ?? elementId : byId;
  }, [data]);
};

/** The task names of the app the workflows on screen belong to. */
export const TaskNamesContext = createContext<TaskNameOf>(byId);

export const useTaskNameOf = (): TaskNameOf => useContext(TaskNamesContext);
