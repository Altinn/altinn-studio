/**
 * The task types the Altinn app runtime ships with, mirroring
 * `Altinn.App.Core.Constants.AltinnTaskTypes`. Keep the two lists in step.
 */
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
 * A task type is not a closed set. Apps implement their own service tasks (`IServiceTask` /
 * `IPipelineServiceTask` are `[ImplementableByApps]`), and the runtime resolves a
 * `bpmn:serviceTask` by matching `altinn:taskType` against the registered implementations
 * (`ServiceTaskLookupExtensions.FindServiceTask`). Studio cannot enumerate those, so any string
 * is a legal value here.
 *
 * The union with the built-in literals is kept so editors still suggest them; `string & {}` is
 * the idiom that widens the type without collapsing the suggestions.
 */
export type BpmnTaskType = BuiltInBpmnTaskType | (string & {});
