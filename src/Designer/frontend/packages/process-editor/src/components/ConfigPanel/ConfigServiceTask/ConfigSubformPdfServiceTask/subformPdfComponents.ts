import { ArrayUtils } from '@studio/pure-functions';
import type { SubformComponent } from 'app-shared/types/api/SubformComponent';

/** The subform pdf task as the checks read it. Its pages are the ui folder named after it. */
export type SubformPdfTask = {
  taskId: string;
  hasPages: boolean;
  subformComponentId: string;
  subformDataTypeId: string;
};

export type SubformPdfIssue =
  /** No Subform component in the app has the id the task points at. */
  | { kind: 'componentNotFound' }
  /** The components that decide which subform the id opens disagree. */
  | { kind: 'ambiguousComponent' }
  /** The component opens no subform, or one without a default data type. */
  | { kind: 'missingSubformDataType' }
  /** The task names another data type than the one the subform stores its entries in. */
  | { kind: 'dataTypeMismatch'; subformDataTypeId: string }
  /** The task has no pages to look the component up in. */
  | { kind: 'missingPages' }
  /** The task's pages lack a hidden copy of the component that opens the same subform. */
  | { kind: 'missingComponentCopy' };

/**
 * The app frontend looks the task's `subformComponentId` up on the task's own pages and renders
 * the subform that component opens for every data element of `subformDataTypeId`. Reports the
 * first thing that stops this from working, or nothing while the task points at no component.
 */
export const getSubformPdfIssue = (
  task: SubformPdfTask,
  subformComponents: SubformComponent[],
): SubformPdfIssue | undefined => {
  if (!task.subformComponentId) return undefined;

  const components = getComponentsWithId(subformComponents, task.subformComponentId);
  if (components.length === 0) return { kind: 'componentNotFound' };

  const references = getReferenceComponents(components, task.taskId);
  if (opensDifferentSubforms(references)) return { kind: 'ambiguousComponent' };

  const [{ subformLayoutSetId, subformDataTypeId }] = references;
  if (!subformDataTypeId) return { kind: 'missingSubformDataType' };
  if (subformDataTypeId !== task.subformDataTypeId) {
    return { kind: 'dataTypeMismatch', subformDataTypeId };
  }

  const hasComponentCopy = components.some(
    (component) =>
      component.layoutSetId === task.taskId && component.subformLayoutSetId === subformLayoutSetId,
  );
  if (!hasComponentCopy) return { kind: task.hasPages ? 'missingComponentCopy' : 'missingPages' };

  return undefined;
};

/** The component ids that open a single subform with a default data type. */
export const getSelectableSubformComponentIds = (
  subformComponents: SubformComponent[],
  taskId: string,
): string[] =>
  ArrayUtils.removeDuplicates(ArrayUtils.mapByKey(subformComponents, 'componentId')).filter(
    (componentId) => {
      const components = getComponentsWithId(subformComponents, componentId);
      const references = getReferenceComponents(components, taskId);
      return !opensDifferentSubforms(references) && Boolean(references[0].subformDataTypeId);
    },
  );

/** The component to copy to the task's pages: an original rather than the copy already there. */
export const getSourceSubformComponent = (
  subformComponents: SubformComponent[],
  componentId: string,
  taskId: string,
): SubformComponent | undefined =>
  getReferenceComponents(getComponentsWithId(subformComponents, componentId), taskId)[0];

const getComponentsWithId = (
  subformComponents: SubformComponent[],
  componentId: string,
): SubformComponent[] =>
  subformComponents.filter((component) => component.componentId === componentId);

/**
 * Prefer source tables over copies on PDF tasks. If the source was removed, prefer the
 * selected task's own copy so other PDF tasks cannot make its configuration ambiguous.
 */
const getReferenceComponents = (
  components: SubformComponent[],
  taskId: string,
): SubformComponent[] => {
  const originals = components.filter(
    (component) => component.layoutSetId !== taskId && component.taskType !== 'subformPdf',
  );
  if (originals.length > 0) return originals;
  const copies = components.filter(({ layoutSetId }) => layoutSetId === taskId);
  return copies.length > 0 ? copies : components;
};

const opensDifferentSubforms = (components: SubformComponent[]): boolean =>
  ArrayUtils.removeDuplicates(ArrayUtils.mapByKey(components, 'subformLayoutSetId')).length > 1;
