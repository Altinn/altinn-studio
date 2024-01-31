import React from 'react';

import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import ResizeObserverModule from 'resize-observer-polyfill';

import { getFormLayoutRepeatingGroupMock } from 'src/__mocks__/getFormLayoutGroupMock';
import { RepeatingGroupProvider, useRepeatingGroupSelector } from 'src/layout/RepeatingGroup/RepeatingGroupContext';
import { RepeatingGroupTable } from 'src/layout/RepeatingGroup/RepeatingGroupTable';
import { mockMediaQuery } from 'src/test/mockMediaQuery';
import { renderWithNode } from 'src/test/renderWithProviders';
import type { CompCheckboxesExternal } from 'src/layout/Checkboxes/config.generated';
import type { IRawOption } from 'src/layout/common.generated';
import type { CompOrGroupExternal, ILayoutCollection } from 'src/layout/layout';
import type {
  CompRepeatingGroupExternal,
  CompRepeatingGroupInternal,
} from 'src/layout/RepeatingGroup/config.generated';
import type { BaseLayoutNode } from 'src/utils/layout/LayoutNode';

(global as any).ResizeObserver = ResizeObserverModule;

const getLayout = (group: CompRepeatingGroupExternal, components: CompOrGroupExternal[]): ILayoutCollection => ({
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
  const components: CompOrGroupExternal[] = [
    {
      id: 'field1',
      type: 'Input',
      dataModelBindings: {
        simpleBinding: 'some-group.prop1',
      },
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

      expect(screen.getByText('test row 0')).toBeInTheDocument();
      expect(screen.getByText('test row 1')).toBeInTheDocument();
      await userEvent.click(screen.getAllByRole('button', { name: /slett/i })[0]);

      expect(formDataMethods.removeIndexFromList).toBeCalledTimes(1);
      expect(formDataMethods.removeIndexFromList).toBeCalledWith({
        path: 'some-group',
        index: 0,
      });

      expect(screen.queryByText('test row 0')).not.toBeInTheDocument();
      expect(screen.getByText('test row 1')).toBeInTheDocument();
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
    await renderWithNode<true, BaseLayoutNode<CompRepeatingGroupInternal>>({
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
            { checkBoxBinding: 'option.value', prop1: 'test row 0' },
            { checkBoxBinding: 'option.value', prop1: 'test row 1' },
            { checkBoxBinding: 'option.value', prop1: 'test row 2' },
            { checkBoxBinding: 'option.value', prop1: 'test row 3' },
          ],
        }),
      },
    });
});

function LeakEditIndex() {
  const editingIndex = useRepeatingGroupSelector((state) => state.editingIndex);
  return <div data-testid='editIndex'>{editingIndex === undefined ? 'undefined' : editingIndex}</div>;
}
