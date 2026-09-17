/**
 * Mirrors `Altinn.Studio.Designer.Enums.TaskType`, the task types the backend creates ui folders
 * for. Keep the two in step.
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
