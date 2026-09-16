/**
 * The task types the Designer backend accepts when a ui folder is created, mirroring
 * `Altinn.Studio.Designer.Enums.TaskType`. The value decides which files the backend writes into
 * the folder, so a type missing here is a folder the editor cannot ask for.
 *
 * A layout set therefore carries one of these and nothing else, which is what lets the editors name
 * a task by looking its type up in a translation file.
 */
export const bpmnTaskTypes = [
  'data',
  'confirmation',
  'feedback',
  'signing',
  'payment',
  'pdf',
  'subformPdf',
] as const;

export type BpmnTaskType = (typeof bpmnTaskTypes)[number];
