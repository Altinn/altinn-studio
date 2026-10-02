// Keep these task types in sync with Altinn.Studio.Designer.Enums.TaskType, which controls UI folder
// creation.
export type BpmnTaskType =
  'data' | 'confirmation' | 'feedback' | 'signing' | 'payment' | 'pdf' | 'subformPdf';
