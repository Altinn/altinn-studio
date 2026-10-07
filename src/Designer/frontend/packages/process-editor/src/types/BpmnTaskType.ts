/** Keep these values in sync with Altinn.App.Core.Constants.AltinnTaskTypes. */
export const builtInBpmnTaskTypes = [
  'data',
  'confirmation',
  'feedback',
  'signing',
  'payment',
  'pdf',
  'eFormidling',
  'subformPdf',
  'fiksArkiv',
] as const;

export type BuiltInBpmnTaskType = (typeof builtInBpmnTaskTypes)[number];

/** Allow custom task type strings. `string & {}` preserves editor suggestions for built-in types. */
export type BpmnTaskType = BuiltInBpmnTaskType | (string & {});
