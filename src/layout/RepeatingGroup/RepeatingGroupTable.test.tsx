import React from 'react';

import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import ResizeObserverModule from 'resize-observer-polyfill';
import { v4 as uuidv4 } from 'uuid';

import { getFormLayoutRepeatingGroupMock } from 'src/__mocks__/getFormLayoutGroupMock';
import { ALTINN_ROW_ID } from 'src/features/formData/types';
import {
  RepeatingGroupProvider,
  useRepeatingGroupRowState,
  useRepeatingGroupSelector,
} from 'src/layout/RepeatingGroup/RepeatingGroupContext';
import { RepeatingGroupTable } from 'src/layout/RepeatingGroup/RepeatingGroupTable';
import { mockMediaQuery } from 'src/test/mockMediaQuery';
import { renderWithNode } from 'src/test/renderWithProviders';
import type { CompCheckboxesExternal } from 'src/layout/Checkboxes/config.generated';
import type { IRawOption } from 'src/layout/common.generated';
import type { CompExternal, ILayoutCollection } from 'src/layout/layout';
import type { CompRepeatingGroupExternal } from 'src/layout/RepeatingGroup/config.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

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
        simpleBinding: 'some-group.prop1',
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
        simpleBinding: 'some-group.prop2',
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
        simpleBinding: 'some-group.prop3',
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
        simpleBinding: 'some-group.checkboxBinding',
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

      expect(formDataMethods.removeFromListCallback).toBeCalledTimes(1);
      expect(formDataMethods.removeFromListCallback).toBeCalledWith({
        path: 'some-group',
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
  });

  describe('mobile view', () => {
    const { setScreenWidth } = mockMediaQuery(768);
    beforeEach(() => {
      setScreenWidth(768);
    });

    it('should render edit and delete buttons as icons for screens smaller thnn 786px', async () => {
      await render();

      const iconButtonsDelete = screen.getAllByTestId(/delete-button/i);
      const iconButtonsEdit = screen.getAllByTestId(/edit-button/i);

      expect(iconButtonsDelete).toHaveLength(4);
      expect(iconButtonsEdit).toHaveLength(4);

      const iconButtonsDeleteWithText = screen.queryAllByText(/delete/i);
      const iconButtonsEditWithText = screen.queryAllByText(/edit/i);

      expect(iconButtonsDeleteWithText).toHaveLength(0);
      expect(iconButtonsEditWithText).toHaveLength(0);
    });
  });

  const render = async (layout = getLayout(group, components)) =>
    await renderWithNode<true, LayoutNode<'RepeatingGroup'>>({
      nodeId: group.id,
      inInstance: true,
      renderer: ({ node }) => (
        <RepeatingGroupProvider node={node}>
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
