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
  it('reports nothing while the task points at no component', () => {
    expect(getSubformPdfIssue(createTask({ subformComponentId: '' }), [])).toBeUndefined();
  });

  it('reports nothing once the task pages hold the copy and the data type matches', () => {
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

  it('reports a component id that no component in the app has', () => {
    expect(getSubformPdfIssue(createTask(), [otherComponent])).toEqual({
      kind: 'componentNotFound',
    });
  });

  it('reports a component id that only copies on PDF tasks have', () => {
    expect(getSubformPdfIssue(createTask(), [copyOnTaskPages, copyOnOtherPdfTask])).toEqual({
      kind: 'componentNotFound',
    });
  });

  it('reports a component id that components opening different subforms share', () => {
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

  it('reports the data type the subform stores its entries in when the task names another', () => {
    const task = createTask({ subformDataTypeId: 'bicycle' });

    expect(getSubformPdfIssue(task, [original, copyOnTaskPages])).toEqual({
      kind: 'dataTypeMismatch',
      subformDataTypeId: 'moped',
    });
  });

  it('reports the missing pages when the task has none', () => {
    expect(getSubformPdfIssue(createTask({ hasPages: false }), [original])).toEqual({
      kind: 'missingPages',
    });
  });

  it('reports the missing copy when the task pages hold none', () => {
    expect(getSubformPdfIssue(createTask(), [original, otherComponentOnTaskPages])).toEqual({
      kind: 'missingComponentCopy',
    });
  });

  it('reports a copy on the task pages that opens another subform as missing, not ambiguous', () => {
    expect(getSubformPdfIssue(createTask(), [original, outdatedCopyOnTaskPages])).toEqual({
      kind: 'missingComponentCopy',
    });
  });
});

describe('getSelectableSubformComponentIds', () => {
  it('offers every component id once, in the order of the components', () => {
    expect(getSelectableSubformComponentIds([original, otherComponent, copyOnTaskPages])).toEqual([
      componentId,
      otherComponent.componentId,
    ]);
  });

  it('leaves out an id that components opening different subforms share', () => {
    const namesake = createSubformComponent({ layoutSetId: 'Task_3', subformLayoutSetId: 'car' });

    expect(getSelectableSubformComponentIds([original, namesake, otherComponent])).toEqual([
      otherComponent.componentId,
    ]);
  });

  it('leaves out an id whose subform has no default data type', () => {
    const component = createSubformComponent({ subformDataTypeId: null });

    expect(getSelectableSubformComponentIds([component, otherComponent])).toEqual([
      otherComponent.componentId,
    ]);
  });

  it('offers an id whose copy on the task pages opens another subform', () => {
    expect(getSelectableSubformComponentIds([original, outdatedCopyOnTaskPages])).toEqual([
      componentId,
    ]);
  });

  it('leaves out an id that only copies on PDF tasks have', () => {
    expect(
      getSelectableSubformComponentIds([copyOnTaskPages, copyOnOtherPdfTask, otherComponent]),
    ).toEqual([otherComponent.componentId]);
  });
});

describe('getSourceSubformComponent', () => {
  it('prefers the original over the copy on the task pages', () => {
    expect(getSourceSubformComponent([copyOnTaskPages, original], componentId)).toBe(original);
  });

  it('finds nothing to copy when only copies on PDF tasks have the id', () => {
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
