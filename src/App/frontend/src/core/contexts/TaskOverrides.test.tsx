import React from 'react';

import { render, screen } from '@testing-library/react';

import { TaskOverrides, useTaskOverrides } from 'src/core/contexts/TaskOverrides';

function ShowOverrides() {
  return <pre data-testid='overrides'>{JSON.stringify(useTaskOverrides())}</pre>;
}

function renderedOverrides() {
  return JSON.parse(screen.getByTestId('overrides').textContent ?? '');
}

describe('TaskOverrides', () => {
  it('inherits the data element id when an inner override keeps the data type', () => {
    render(
      <TaskOverrides
        dataModelType='Subform'
        dataModelElementId='subform-entry'
        uiFolder='subform-folder'
      >
        <TaskOverrides taskId='Task_1'>
          <ShowOverrides />
        </TaskOverrides>
      </TaskOverrides>,
    );

    expect(renderedOverrides()).toEqual({
      taskId: 'Task_1',
      dataModelType: 'Subform',
      dataModelElementId: 'subform-entry',
      uiFolder: 'subform-folder',
    });
  });

  it('does not inherit the data element id when an inner override changes the data type', () => {
    // A Summary2 targeting another task from inside a subform entry, such as in a subform PDF
    render(
      <TaskOverrides
        dataModelType='Subform'
        dataModelElementId='subform-entry'
        uiFolder='subform-folder'
      >
        <TaskOverrides
          taskId='Task_1'
          uiFolder='Task_1'
          dataModelType='MainForm'
        >
          <ShowOverrides />
        </TaskOverrides>
      </TaskOverrides>,
    );

    expect(renderedOverrides()).toEqual({
      taskId: 'Task_1',
      dataModelType: 'MainForm',
      uiFolder: 'Task_1',
    });
  });

  it('uses the data element id an inner override names, also when it changes the data type', () => {
    render(
      <TaskOverrides
        dataModelType='MainForm'
        dataModelElementId='main-element'
      >
        <TaskOverrides
          dataModelType='Subform'
          dataModelElementId='subform-entry'
        >
          <ShowOverrides />
        </TaskOverrides>
      </TaskOverrides>,
    );

    expect(renderedOverrides()).toEqual({
      dataModelType: 'Subform',
      dataModelElementId: 'subform-entry',
    });
  });
});
