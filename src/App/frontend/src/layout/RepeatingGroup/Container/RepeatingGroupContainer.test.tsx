import React from 'react';

import { beforeAll } from '@jest/globals';
import { screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { v4 as uuidv4 } from 'uuid';

import { getFormLayoutRepeatingGroupMock } from 'src/__mocks__/getFormLayoutGroupMock';
import { defaultMockDataElementId } from 'src/__mocks__/getInstanceDataMock';
import { defaultDataTypeMock } from 'src/__mocks__/getLayoutSetsMock';
import { ALTINN_ROW_ID } from 'src/features/formData/types';
import { type BackendValidationIssue, BackendValidationSeverity } from 'src/features/validation';
import { RepeatingGroupContainer } from 'src/layout/RepeatingGroup/Container/RepeatingGroupContainer';
import {
  RepeatingGroupProvider,
  useRepeatingGroupRowState,
  useRepeatingGroupSelector,
} from 'src/layout/RepeatingGroup/Providers/RepeatingGroupContext';
import { mockMediaQuery } from 'src/test/mockMediaQuery';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import type { ILayout } from 'src/layout/layout';
import type { CompRepeatingGroupExternal } from 'src/layout/RepeatingGroup/config.generated';

const mockContainer = getFormLayoutRepeatingGroupMock({
  id: 'myGroup',
  maxCount: 5,
});

interface IRender {
  container?: Partial<CompRepeatingGroupExternal>;
  numRows?: number;
  validationIssues?: BackendValidationIssue[];
}

async function render({ container, numRows = 3, validationIssues = [] }: IRender = {}) {
  const mockComponents: ILayout = [
    {
      id: 'field1',
      type: 'Input',
      dataModelBindings: {
        simpleBinding: { dataType: defaultDataTypeMock, field: 'Group.prop1' },
      },
      showValidations: [],
      textResourceBindings: {
        title: 'Title1',
      },
      readOnly: false,
      required: false,
    },
    {
      id: 'field2',
      type: 'Input',
      dataModelBindings: {
        simpleBinding: { dataType: defaultDataTypeMock, field: 'Group.prop2' },
      },
      showValidations: [],
      textResourceBindings: {
        title: 'Title2',
      },
      readOnly: false,
      required: false,
    },
    {
      id: 'field3',
      type: 'Input',
      dataModelBindings: {
        simpleBinding: { dataType: defaultDataTypeMock, field: 'Group.prop3' },
      },
      showValidations: [],
      textResourceBindings: {
        title: 'Title3',
      },
      readOnly: false,
      required: false,
    },
    {
      id: 'field4',
      type: 'Checkboxes',
      dataModelBindings: {
        simpleBinding: { dataType: defaultDataTypeMock, field: 'Group.checkboxBinding' },
      },
      showValidations: [],
      textResourceBindings: {
        title: 'Title4',
      },
      readOnly: false,
      required: false,
      options: [{ value: 'option.value', label: 'option.label' }],
    },
  ];

  const group = getFormLayoutRepeatingGroupMock({
    ...mockContainer,
    ...container,
    dataModelBindings: {
      group: { dataType: defaultDataTypeMock, field: 'Group' },
    },
  });

  return await renderWithInstanceAndLayout({
    renderer: (
      <RepeatingGroupProvider baseComponentId={group.id}>
        <LeakEditIndex />
        <RepeatingGroupContainer />
      </RepeatingGroupProvider>
    ),
    queries: {
      fetchLayouts: async () => ({
        FormLayout: {
          data: {
            layout: [group, ...mockComponents],
          },
        },
      }),
      fetchTextResources: () =>
        Promise.resolve({
          language: 'en',
          resources: [
            { id: 'option.label', value: 'Value to be shown' },
            { id: 'button.open', value: 'New open text' },
            { id: 'button.close', value: 'New close text' },
            { id: 'button.save', value: 'New save text' },
          ],
        }),
      fetchFormData: async () => ({
        Group: Array.from({ length: numRows }).map((_, index) => ({
          [ALTINN_ROW_ID]: uuidv4(),
          prop1: `value${index + 1}`,
          checkboxBinding: ['option.value'],
        })),
      }),
      fetchBackendValidations: async () => validationIssues,
    },
    mockFormDataSaving: true,
  });
}

const { setScreenWidth } = mockMediaQuery(992);

describe('RepeatingGroupContainer', () => {
  beforeAll(() => {
    // Set screen size to desktop
    setScreenWidth(1200);
  });

  it('should render add new button with custom label when supplied', async () => {
    await render({
      container: {
        textResourceBindings: {
          add_button: 'person',
        },
        ...mockContainer,
      },
    });
    await waitFor(() => {
      const item = screen.getByText('Legg til ny person');
      expect(item).toBeInTheDocument();
    });
  });

  it('should not show add button when maxOccurs is reached', async () => {
    await render({
      container: {
        maxCount: 3,
      },
    });

    expect(screen.queryByText('Legg til ny')).not.toBeInTheDocument();
  });

  it('should show option label when displaying selection components', async () => {
    await render({ numRows: 1 });

    expect(screen.getByText('Value to be shown')).toBeInTheDocument();
  });

  it('displays components on multiple pages', async () => {
    await render({
      container: {
        edit: {
          ...mockContainer.edit,
          multiPage: true,
        },
        children: ['0:field1', '0:field2', '1:field3', '1:field4'],
      },
    });
    expect(screen.getAllByRole('row')).toHaveLength(4); // 3 rows, 1 header, 0 edit container
    expect(screen.getByTestId('editIndex')).toHaveTextContent('undefined');

    const addButton = screen.getAllByRole('button', {
      name: /Legg til ny/i,
    })[0];
    await userEvent.click(addButton);

    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(6)); // 4 rows, 1 header, 1 edit container
    expect(screen.getByTestId('editIndex')).toHaveTextContent('3'); // Editing the last row we just added
    const editContainer = screen.getByTestId('group-edit-container');
    expect(editContainer).toBeInTheDocument();

    expect(within(editContainer).getByText('Title1')).toBeInTheDocument();
    expect(within(editContainer).getByText('Title2')).toBeInTheDocument();
    expect(within(editContainer).queryByText('Title3')).not.toBeInTheDocument();
    expect(within(editContainer).queryByText('Title4')).not.toBeInTheDocument();

    await userEvent.click(within(editContainer).getByRole('button', { name: /Neste/i }));
    expect(within(editContainer).queryByText('Title1')).not.toBeInTheDocument();
    expect(within(editContainer).queryByText('Title2')).not.toBeInTheDocument();
    expect(within(editContainer).getByText('Title3')).toBeInTheDocument();
    expect(within(editContainer).getByText('Title4')).toBeInTheDocument();
  });

  it('should trigger validate when saving if validateOnSaveRow is set', async () => {
    await render({
      container: {
        validateOnSaveRow: ['All'],
      },
      validationIssues: [
        {
          customTextKey: 'Feltet er feil',
          field: 'Group[0].prop1',
          dataElementId: defaultMockDataElementId,
          severity: BackendValidationSeverity.Error,
          source: 'custom',
        } as BackendValidationIssue,
      ],
    });

    await userEvent.click(
      screen.getAllByRole('button', {
        name: /Rediger/i,
      })[0],
    );

    await userEvent.click(
      screen.getAllByRole('button', {
        name: /Lagre og lukk/i,
      })[1],
    );

    await waitFor(() => expect(screen.getByText(/feltet er feil/i)).toBeInTheDocument());
  });

  it('should NOT trigger validate when saving if validation trigger is NOT present', async () => {
    await render({
      validationIssues: [
        {
          customTextKey: 'Feltet er feil',
          field: 'Group[0].prop1',
          dataElementId: defaultMockDataElementId,
          severity: BackendValidationSeverity.Error,
          source: 'custom',
        } as BackendValidationIssue,
      ],
    });

    await userEvent.click(
      screen.getAllByRole('button', {
        name: /Rediger/i,
      })[0],
    );

    await userEvent.click(
      screen.getAllByRole('button', {
        name: /Lagre og lukk/i,
      })[1],
    );

    expect(screen.queryByText(/feltet er feil/i)).not.toBeInTheDocument();
  });

  it('should display "Add new" button when edit.addButton is undefined', async () => {
    await render();

    const addButton = screen.getByText('Legg til ny');
    expect(addButton).toBeInTheDocument();
  });

  it('should not display "Add new" button when edit.addButton is false', async () => {
    const mockContainerDisabledAddButton = {
      ...mockContainer,
      edit: {
        addButton: false,
      },
    };
    await render({ container: mockContainerDisabledAddButton });

    const addButton = screen.queryByText('Legg til ny');
    expect(addButton).not.toBeInTheDocument();
  });

  it('should display "Add new" button when edit.addButton is true', async () => {
    const mockContainerDisabledAddButton = {
      ...mockContainer,
      edit: {
        addButton: true,
      },
    };
    await render({ container: mockContainerDisabledAddButton });

    const addButton = screen.getByText('Legg til ny');
    expect(addButton).toBeInTheDocument();
  });

  it('should display textResourceBindings.edit_button_open as edit button if present when opening', async () => {
    await render({
      container: {
        textResourceBindings: {
          edit_button_open: 'button.open',
        },
      },
      numRows: 4,
    });

    const openButtons = screen.getAllByText('New open text');
    expect(openButtons).toHaveLength(4);
  });

  it('should display textResourceBindings.edit_button_close as edit button if present when closing', async () => {
    await render({
      container: {
        textResourceBindings: {
          edit_button_close: 'button.close',
        },
      },
      numRows: 4,
    });

    // Open first row for editing first
    await userEvent.click(screen.getAllByRole('button', { name: /Rediger/i })[0]);

    const closeButtons = screen.getAllByText('New close text');
    expect(closeButtons).toHaveLength(1);
  });

  it('should display textResourceBindings.save_button as save button if present', async () => {
    await render({
      container: {
        textResourceBindings: {
          save_button: 'button.save',
        },
      },
    });

    // Open first row for editing first
    await userEvent.click(screen.getAllByRole('button', { name: /Rediger/i })[0]);

    const saveButton = screen.getByText('New save text');
    expect(saveButton).toBeInTheDocument();
  });
});

function LeakEditIndex() {
  const editingId = useRepeatingGroupSelector((state) => state.editingId);
  const { visibleRows } = useRepeatingGroupRowState();
  const editingIndex = visibleRows.find((r) => r.uuid === editingId)?.index;
  return <div data-testid='editIndex'>{editingIndex === undefined ? 'undefined' : editingIndex}</div>;
}
