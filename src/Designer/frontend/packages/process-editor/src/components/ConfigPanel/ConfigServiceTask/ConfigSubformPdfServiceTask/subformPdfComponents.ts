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
  /** No original has the id the task points at, even if a copy on a PDF task still does. */
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
 * the subform that component opens for every data element of `subformDataTypeId`. Checks the
 * task against the original the copy is made from, and reports the first problem, or nothing
 * while the task points at no component.
 */
export const getSubformPdfIssue = (
  task: SubformPdfTask,
  subformComponents: SubformComponent[],
): SubformPdfIssue | undefined => {
  if (!task.subformComponentId) return undefined;

  const components = getComponentsWithId(subformComponents, task.subformComponentId);
  const originals = getOriginals(components);
  if (originals.length === 0) return { kind: 'componentNotFound' };
  if (opensDifferentSubforms(originals)) return { kind: 'ambiguousComponent' };

  const [{ subformLayoutSetId, subformDataTypeId }] = originals;
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

/** The ids of the originals that open a single subform with a default data type. */
export const getSelectableSubformComponentIds = (
  subformComponents: SubformComponent[],
): string[] => {
  const originals = getOriginals(subformComponents);
  return ArrayUtils.removeDuplicates(ArrayUtils.mapByKey(originals, 'componentId')).filter(
    (componentId) => {
      const components = getComponentsWithId(originals, componentId);
      return !opensDifferentSubforms(components) && Boolean(components[0].subformDataTypeId);
    },
  );
};

/** The original to copy to the task's pages. */
export const getSourceSubformComponent = (
  subformComponents: SubformComponent[],
  componentId: string,
): SubformComponent | undefined =>
  getOriginals(getComponentsWithId(subformComponents, componentId))[0];

const getComponentsWithId = (
  subformComponents: SubformComponent[],
  componentId: string,
): SubformComponent[] =>
  subformComponents.filter((component) => component.componentId === componentId);

/** The components outside the pages of PDF tasks, which only hold copies. */
const getOriginals = (components: SubformComponent[]): SubformComponent[] =>
  components.filter((component) => component.taskType !== 'subformPdf');

const opensDifferentSubforms = (components: SubformComponent[]): boolean =>
  ArrayUtils.removeDuplicates(ArrayUtils.mapByKey(components, 'subformLayoutSetId')).length > 1;
