import { describe, expect, it } from 'vitest';
import type { SubformComponent } from 'app-shared/types/api/SubformComponent';
import {
  getSelectableSubformComponentIds,
  getSourceSubformComponent,
  getSubformPdfIssue,
  type SubformPdfTask,
} from './subformPdfComponents';

const taskId = 'Task_2';
const componentId = 'subform-mopeder';

describe('getSubformPdfIssue', () => {
  it('reports no issue when no component is selected', () => {
    expect(getSubformPdfIssue(createTask({ subformComponentId: '' }), [])).toBeUndefined();
  });

  it('reports no issue when the component copy and data type are valid', () => {
    expect(getSubformPdfIssue(createTask(), [original, copyOnTaskPages])).toBeUndefined();
  });

  it('ignores stale copies on other PDF tasks when resolving the source table', () => {
    const staleCopy = createSubformComponent({
      layoutSetId: 'OtherPdfTask',
      taskType: 'subformPdf',
      subformLayoutSetId: 'old-subform',
      subformDataTypeId: 'old-model',
    });
    const components = [staleCopy, original, copyOnTaskPages];

    expect(getSubformPdfIssue(createTask(), components)).toBeUndefined();
    expect(getSelectableSubformComponentIds(components)).toEqual([componentId]);
    expect(getSourceSubformComponent(components, componentId)).toBe(original);
  });

  it('reports a missing source component', () => {
    expect(getSubformPdfIssue(createTask(), [otherComponent])).toEqual({
      kind: 'componentNotFound',
    });
  });

  it('reports a missing source when only generated copies have the ID', () => {
    expect(getSubformPdfIssue(createTask(), [copyOnTaskPages, copyOnOtherPdfTask])).toEqual({
      kind: 'componentNotFound',
    });
  });

  it('reports a component ID shared by different subforms', () => {
    const namesake = createSubformComponent({ layoutSetId: 'Task_3', subformLayoutSetId: 'car' });

    expect(getSubformPdfIssue(createTask(), [original, namesake, copyOnTaskPages])).toEqual({
      kind: 'ambiguousComponent',
    });
  });

  it('reports a component that opens a subform without a default data type', () => {
    const component = createSubformComponent({ subformDataTypeId: null });

    expect(getSubformPdfIssue(createTask(), [component])).toEqual({
      kind: 'missingSubformDataType',
    });
  });

  it('reports a component that opens no subform', () => {
    const component = createSubformComponent({ subformLayoutSetId: null, subformDataTypeId: null });

    expect(getSubformPdfIssue(createTask(), [component])).toEqual({
      kind: 'missingSubformDataType',
    });
  });

  it('reports the expected subform data type when the task uses another type', () => {
    const task = createTask({ subformDataTypeId: 'bicycle' });

    expect(getSubformPdfIssue(task, [original, copyOnTaskPages])).toEqual({
      kind: 'dataTypeMismatch',
      subformDataTypeId: 'moped',
    });
  });

  it('reports missing task pages', () => {
    expect(getSubformPdfIssue(createTask({ hasPages: false }), [original])).toEqual({
      kind: 'missingPages',
    });
  });

  it('reports a missing component copy', () => {
    expect(getSubformPdfIssue(createTask(), [original, otherComponentOnTaskPages])).toEqual({
      kind: 'missingComponentCopy',
    });
  });

  it('reports a missing copy when the task copy references another subform', () => {
    expect(getSubformPdfIssue(createTask(), [original, outdatedCopyOnTaskPages])).toEqual({
      kind: 'missingComponentCopy',
    });
  });
});

describe('getSelectableSubformComponentIds', () => {
  it('lists unique component IDs in component order', () => {
    expect(getSelectableSubformComponentIds([original, otherComponent, copyOnTaskPages])).toEqual([
      componentId,
      otherComponent.componentId,
    ]);
  });

  it('excludes IDs shared by components that reference different subforms', () => {
    const namesake = createSubformComponent({ layoutSetId: 'Task_3', subformLayoutSetId: 'car' });

    expect(getSelectableSubformComponentIds([original, namesake, otherComponent])).toEqual([
      otherComponent.componentId,
    ]);
  });

  it('excludes components whose subform has no default data type', () => {
    const component = createSubformComponent({ subformDataTypeId: null });

    expect(getSelectableSubformComponentIds([component, otherComponent])).toEqual([
      otherComponent.componentId,
    ]);
  });

  it('includes source IDs when the task copy references another subform', () => {
    expect(getSelectableSubformComponentIds([original, outdatedCopyOnTaskPages])).toEqual([
      componentId,
    ]);
  });

  it('excludes IDs found only in generated PDF task copies', () => {
    expect(
      getSelectableSubformComponentIds([copyOnTaskPages, copyOnOtherPdfTask, otherComponent]),
    ).toEqual([otherComponent.componentId]);
  });
});

describe('getSourceSubformComponent', () => {
  it('returns the source component instead of the task copy', () => {
    expect(getSourceSubformComponent([copyOnTaskPages, original], componentId)).toBe(original);
  });

  it('returns undefined when the ID exists only in generated copies', () => {
    expect(
      getSourceSubformComponent([copyOnTaskPages, copyOnOtherPdfTask], componentId),
    ).toBeUndefined();
  });
});

function createSubformComponent(overrides: Partial<SubformComponent> = {}): SubformComponent {
  return {
    componentId,
    layoutSetId: 'Task_1',
    layoutName: 'utfylling',
    subformLayoutSetId: 'moped-subform',
    subformDataTypeId: 'moped',
    ...overrides,
  };
}

const original = createSubformComponent();
const copyOnTaskPages = createSubformComponent({
  layoutSetId: taskId,
  layoutName: 'ServiceTask',
  taskType: 'subformPdf',
});
const copyOnOtherPdfTask: SubformComponent = { ...copyOnTaskPages, layoutSetId: 'OtherPdfTask' };
const outdatedCopyOnTaskPages: SubformComponent = {
  ...copyOnTaskPages,
  subformLayoutSetId: 'old-moped-subform',
  subformDataTypeId: 'old-moped',
};
const otherComponent = createSubformComponent({
  componentId: 'subform-cars',
  subformLayoutSetId: 'car-subform',
  subformDataTypeId: 'car',
});
const otherComponentOnTaskPages: SubformComponent = {
  ...otherComponent,
  layoutSetId: taskId,
  taskType: 'subformPdf',
};

function createTask(overrides: Partial<SubformPdfTask> = {}): SubformPdfTask {
  return {
    taskId,
    hasPages: true,
    subformComponentId: componentId,
    subformDataTypeId: 'moped',
    ...overrides,
  };
}
