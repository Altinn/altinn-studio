/**
 * A v9 app binds a data type with `taskIds` alone, so an empty list means no task; a v8 app binds it with `taskId`.
 */
export const getTaskIdsForDataType = (dataType: {
  taskId?: string | null;
  taskIds?: string[] | null;
}): string[] => dataType.taskIds ?? (dataType.taskId ? [dataType.taskId] : []);
