import React from 'react';

import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import ResizeObserverModule from 'resize-observer-polyfill';
import { v4 as uuidv4 } from 'uuid';

import { getFormLayoutRepeatingGroupMock } from 'src/__mocks__/getFormLayoutGroupMock';
import { defaultDataTypeMock } from 'src/__mocks__/getLayoutSetsMock';
import { ALTINN_ROW_ID } from 'src/features/formData/types';
import {
  RepeatingGroupProvider,
  useRepeatingGroupRowState,
  useRepeatingGroupSelector,
} from 'src/layout/RepeatingGroup/Providers/RepeatingGroupContext';
import { RepeatingGroupTable } from 'src/layout/RepeatingGroup/Table/RepeatingGroupTable';
import { mockMediaQuery } from 'src/test/mockMediaQuery';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import type { CompCheckboxesExternal } from 'src/layout/Checkboxes/config.generated';
import type { IRawOption } from 'src/layout/common.generated';
import type { CompExternal, ILayoutCollection } from 'src/layout/layout';
import type { CompRepeatingGroupExternal } from 'src/layout/RepeatingGroup/config.generated';

global.ResizeObserver = ResizeObserverModule;

const getLayout = (group: CompRepeatingGroupExternal, components: CompExternal[]): ILayoutCollection => ({
  FormLayout: {
    data: {
      layout: [group, ...components],
    },
  },
});

describe('RepeatingGroupTable', () => {
  const group = getFormLayoutRepeatingGroupMock({
    id: 'mock-container-id',
  });
  const options: IRawOption[] = [{ value: 'option.value', label: 'option.label' }];
  const components: CompExternal[] = [
    {
      id: 'field1',
      type: 'Input',
      dataModelBindings: {
        simpleBinding: { dataType: defaultDataTypeMock, field: 'some-group.prop1' },
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
        simpleBinding: { dataType: defaultDataTypeMock, field: 'some-group.prop2' },
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
        simpleBinding: { dataType: defaultDataTypeMock, field: 'some-group.prop3' },
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
        simpleBinding: { dataType: defaultDataTypeMock, field: 'some-group.checkboxBinding' },
      },
      showValidations: [],
      textResourceBindings: {
        title: 'Title4',
      },
      readOnly: false,
      required: false,
      options,
    } as CompCheckboxesExternal,
  ];

  describe('popOver warning', () => {
    it('should open and close delete-warning on delete click when alertOnDelete is active', async () => {
      const group = getFormLayoutRepeatingGroupMock({
        id: 'mock-container-id',
        edit: { alertOnDelete: true },
      });
      const layout = getLayout(group, components);

      if (!layout.layouts) {
        return;
      }

      await render(layout);

      await userEvent.click(screen.getAllByRole('button', { name: /slett/i })[0]);

      expect(screen.getByText('Er du sikker på at du vil slette denne raden?')).toBeInTheDocument();

      await userEvent.click(screen.getAllByRole('button', { name: /avbryt/i })[0]);

      expect(screen.queryByText('Er du sikker på at du vil slette denne raden?')).not.toBeInTheDocument();
    });
  });

  describe('desktop view', () => {
    const { setScreenWidth } = mockMediaQuery(992);
    beforeEach(() => {
      setScreenWidth(1337);
    });

    it('should remove row on delete-button click', async () => {
      const { formDataMethods } = await render();

      await screen.findByText('test row 0');
      await screen.findByText('test row 1');
      await userEvent.click(screen.getAllByRole('button', { name: /slett/i })[0]);

      expect(formDataMethods.removeFromListCallback).toHaveBeenCalledTimes(1);
      expect(formDataMethods.removeFromListCallback).toHaveBeenCalledWith({
        reference: { field: 'some-group', dataType: defaultDataTypeMock },
        startAtIndex: 0,
        callback: expect.any(Function),
      });

      await waitFor(() => expect(screen.queryByText('test row 0')).not.toBeInTheDocument());
      await screen.findByText('test row 1');
    });

    it('should open first row for editing when clicking edit button', async () => {
      await render();

      expect(screen.getByTestId('editIndex')).toHaveTextContent('undefined');
      await userEvent.click(screen.getAllByRole('button', { name: /rediger/i })[0]);
      expect(screen.getByTestId('editIndex')).toHaveTextContent('0');
    });

    it('should render EditableCell when editInTable is enabled for a column', async () => {
      const groupWithEditInTable = getFormLayoutRepeatingGroupMock({
        id: 'mock-container-id',
        tableColumns: { field1: { editInTable: true } },
      });
      const layout = getLayout(groupWithEditInTable, components);
      await render(layout);
      const inputs = screen.getAllByRole('textbox');
      expect(inputs.length).toBeGreaterThan(0);
      const field1Inputs = inputs.filter((input) => input.getAttribute('id')?.includes('field1'));
      expect(field1Inputs.length).toBeGreaterThan(0);
    });

    it('should render EditableCell when edit mode is onlyTable', async () => {
      const groupWithOnlyTableMode = getFormLayoutRepeatingGroupMock({
        id: 'mock-container-id',
        edit: { mode: 'onlyTable' },
        tableColumns: { field1: { editInTable: true } },
      });
      const layout = getLayout(groupWithOnlyTableMode, components);
      await render(layout);
      const inputs = screen.getAllByRole('textbox');
      expect(inputs.length).toBeGreaterThan(0);
      const field1Inputs = inputs.filter((input) => input.getAttribute('id')?.includes('field1'));
      expect(field1Inputs.length).toBeGreaterThan(0);
    });
  });

  describe('mobile view', () => {
    const { setScreenWidth } = mockMediaQuery(768);
    beforeEach(() => {
      setScreenWidth(768);
    });

    it('should render edit and delete buttons as icons for screens smaller thnn 786px', async () => {
      await render();

      const iconButtonsDelete = screen.getAllByRole('button', { name: /Slett/ });
      const iconButtonsEdit = screen.getAllByRole('button', { name: /Rediger/ });

      expect(iconButtonsDelete).toHaveLength(4);
      expect(iconButtonsEdit).toHaveLength(4);

      const iconButtonsDeleteWithText = screen.queryAllByText(/delete/i);
      const iconButtonsEditWithText = screen.queryAllByText(/edit/i);

      expect(iconButtonsDeleteWithText).toHaveLength(0);
      expect(iconButtonsEditWithText).toHaveLength(0);
    });
  });

  describe('compactButtons', () => {
    const { setScreenWidth } = mockMediaQuery(992);
    beforeEach(() => {
      setScreenWidth(1337);
    });

    it('should hide button text in view mode when compactButtons is true', async () => {
      const groupWithCompactButtons = getFormLayoutRepeatingGroupMock({
        id: 'mock-container-id',
        edit: { compactButtons: true },
      });
      const layout = getLayout(groupWithCompactButtons, components);
      await render(layout);
      const editButtons = screen.getAllByRole('button', { name: /Rediger/i });
      const deleteButtons = screen.getAllByRole('button', { name: /Slett/i });
      expect(editButtons).toHaveLength(4);
      expect(deleteButtons).toHaveLength(4);
      editButtons.forEach((button) => {
        expect(button).not.toHaveTextContent('Rediger');
      });
      deleteButtons.forEach((button) => {
        expect(button).not.toHaveTextContent('Slett');
      });
    });

    it('should show button text in edit mode when compactButtons is true', async () => {
      const groupWithCompactButtons = getFormLayoutRepeatingGroupMock({
        id: 'mock-container-id',
        edit: { compactButtons: true },
      });
      const layout = getLayout(groupWithCompactButtons, components);
      await render(layout);
      await userEvent.click(screen.getAllByRole('button', { name: /Rediger/i })[0]);
      expect(screen.getByTestId('editIndex')).toHaveTextContent('0');
      const editButtonsInEditMode = screen.getAllByRole('button', { name: /Lagre og lukk/i });
      const tableEditButton = editButtonsInEditMode.find((btn) => btn.classList.contains('tableButton'));
      expect(tableEditButton).toHaveTextContent('Lagre og lukk');
      const deleteButtons = screen.getAllByRole('button', { name: /Slett/i });
      expect(deleteButtons[0]).toHaveTextContent('Slett');
      expect(deleteButtons[1]).not.toHaveTextContent('Slett');
    });
  });

  const render = async (layout = getLayout(group, components)) =>
    await renderWithInstanceAndLayout({
      renderer: (
        <RepeatingGroupProvider baseComponentId={group.id}>
          <LeakEditIndex />
          <RepeatingGroupTable />
        </RepeatingGroupProvider>
      ),
      queries: {
        fetchLayouts: async () => layout,
        fetchTextResources: async () => ({
          language: 'nb',
          resources: [
            {
              id: 'option.label',
              value: 'Value to be shown',
            },
            {
              id: 'general.delete',
              value: 'Slett',
            },
            {
              id: 'general.edit_alt',
              value: 'Rediger',
            },
            {
              id: 'general.save_and_close',
              value: 'Lagre og lukk',
            },
          ],
        }),
        fetchFormData: async () => ({
          'some-group': [
            { [ALTINN_ROW_ID]: uuidv4(), checkBoxBinding: 'option.value', prop1: 'test row 0' },
            { [ALTINN_ROW_ID]: uuidv4(), checkBoxBinding: 'option.value', prop1: 'test row 1' },
            { [ALTINN_ROW_ID]: uuidv4(), checkBoxBinding: 'option.value', prop1: 'test row 2' },
            { [ALTINN_ROW_ID]: uuidv4(), checkBoxBinding: 'option.value', prop1: 'test row 3' },
          ],
        }),
      },
    });
});

function LeakEditIndex() {
  const editingId = useRepeatingGroupSelector((state) => state.editingId);
  const { visibleRows } = useRepeatingGroupRowState();
  const editingIndex = visibleRows.find((r) => r.uuid === editingId)?.index;
  return <div data-testid='editIndex'>{editingIndex === undefined ? 'undefined' : editingIndex}</div>;
}
