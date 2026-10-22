/**
 * An app that reads `taskIds` binds a data type with that list alone, so an empty list means no task;
 * an older app binds it with `taskId`.
 */
export const getTaskIdsForDataType = (dataType: {
  taskId?: string | null;
  taskIds?: string[] | null;
}): string[] => dataType.taskIds ?? (dataType.taskId ? [dataType.taskId] : []);
