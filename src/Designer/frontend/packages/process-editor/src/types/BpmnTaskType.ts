/** Mirrors `Altinn.App.Core.Constants.AltinnTaskTypes`; keep the two in step. */
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

/**
 * Apps register their own service task types, so any string is legal. `string & {}` keeps the
 * built-in literals as editor suggestions.
 */
export type BpmnTaskType = BuiltInBpmnTaskType | (string & {});
