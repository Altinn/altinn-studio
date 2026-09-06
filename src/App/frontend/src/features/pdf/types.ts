export interface IPdfFormat {
  excludedPages: string[];
  excludedComponents: string[];
}

export interface IPdfPreviewDataElement {
  id: string;
  dataType: string;
}

export interface IPdfPreviewTask {
  taskId: string;
  name?: string | null;
  taskType: string;
  autoPdfTaskIds?: string[] | null;
  subformComponentId?: string | null;
  subformDataTypeId?: string | null;
  dataElements?: IPdfPreviewDataElement[] | null;
}

export interface IPdfPreviewTasksResponse {
  tasks: IPdfPreviewTask[];
}
