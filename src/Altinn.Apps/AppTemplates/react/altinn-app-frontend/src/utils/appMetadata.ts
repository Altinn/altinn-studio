export function getDataTaskDataTypeId(taskId: string, dataTypes: any[]): string {
  if (!dataTypes || dataTypes.length === 0) {
    return null;
  }

  const result = dataTypes.find((dataType) => {
    return dataType.appLogic !== null && dataType.taskId === taskId;
  });
  return result?.id;
}
