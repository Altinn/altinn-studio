/**
 * The task types the Designer backend accepts when a ui folder is created, mirroring
 * `Altinn.Studio.Designer.Enums.TaskType`. The value decides which files the backend writes into
 * the folder, so a type missing here is a folder the editor cannot ask for.
 */
export type BpmnTaskType =
  'data' | 'confirmation' | 'feedback' | 'signing' | 'payment' | 'pdf' | 'subformPdf';
