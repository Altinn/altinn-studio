import { ArrayUtils } from '@studio/pure-functions';
import type { SubformComponent } from 'app-shared/types/api/SubformComponent';

/** The task pages are stored in the UI folder named after the task ID. */
export type SubformPdfTask = {
  taskId: string;
  hasPages: boolean;
  subformComponentId: string;
  subformDataTypeId: string;
};

export type SubformPdfIssue =
  /** No source component has the selected ID. Generated copies do not count as sources. */
  | { kind: 'componentNotFound' }
  /** Source components with the same ID reference different subforms. */
  | { kind: 'ambiguousComponent' }
  /** The component opens no subform, or one without a default data type. */
  | { kind: 'missingSubformDataType' }
  | { kind: 'dataTypeMismatch'; subformDataTypeId: string }
  | { kind: 'missingPages' }
  /** The task pages have no hidden copy that references the selected subform. */
  | { kind: 'missingComponentCopy' };

/**
 * Validate the task against its source component. The frontend requires a component copy on the task
 * pages and renders one PDF per subform data element. Return the first issue, or no issue if no
 * component is selected.
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

/** Returns source component IDs that identify one subform with a default data type. */
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

/** Exclude PDF task copies when finding source components. */
const getOriginals = (components: SubformComponent[]): SubformComponent[] =>
  components.filter((component) => component.taskType !== 'subformPdf');

const opensDifferentSubforms = (components: SubformComponent[]): boolean =>
  ArrayUtils.removeDuplicates(ArrayUtils.mapByKey(components, 'subformLayoutSetId')).length > 1;
