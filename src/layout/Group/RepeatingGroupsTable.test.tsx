import React from 'react';

import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResizeObserverModule from 'resize-observer-polyfill';

import { getFormLayoutGroupMock } from 'src/__mocks__/formLayoutGroupMock';
import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { RepeatingGroupTable } from 'src/layout/Group/RepeatingGroupTable';
import { mockMediaQuery, renderWithProviders } from 'src/testUtils';
import { useResolvedNode } from 'src/utils/layout/ExprContext';
import type { IAttachments } from 'src/features/attachments';
import type { ExprUnresolved } from 'src/features/expressions/types';
import type { IFormData } from 'src/features/formData';
import type { ILayoutState } from 'src/features/layout/formLayoutSlice';
import type { ILayoutCompCheckboxes } from 'src/layout/Checkboxes/types';
import type { IRepeatingGroupTableProps } from 'src/layout/Group/RepeatingGroupTable';
import type { HRepGroup, ILayoutGroup } from 'src/layout/Group/types';
import type { ComponentInGroup, ILayoutComponent } from 'src/layout/layout';
import type { IOption, ITextResource } from 'src/types';
import type { ILanguage } from 'src/types/shared';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

(global as any).ResizeObserver = ResizeObserverModule;

const user = userEvent.setup();

const getLayout = (
  group: ExprUnresolved<ILayoutGroup>,
  components: ExprUnresolved<ILayoutComponent | ComponentInGroup>[],
) => {
  const layout: ILayoutState = {
    layouts: {
      FormLayout: [group, ...components],
    },
    uiConfig: {
      hiddenFields: [],
      repeatingGroups: {
        'mock-container-id': {
          index: 3,
        },
      },
      currentView: 'FormLayout',
      focus: undefined,
      tracks: {
        order: ['FormLayout'],
        hidden: [],
        hiddenExpr: {},
      },
      excludePageFromPdf: [],
      excludeComponentFromPdf: [],
    },
    error: null,
    layoutsets: null,
  };

  return layout;
};

describe('RepeatingGroupTable', () => {
  const group: ExprUnresolved<ILayoutGroup> = getFormLayoutGroupMock({
    id: 'mock-container-id',
  });
  const language: ILanguage = {
    general: {
      delete: 'Delete',
      edit_alt: 'Edit',
      cancel: 'Cancel',
    },
    group: {
      row_popover_delete_message: 'Are you sure you want to delete this row?',
      row_popover_delete_button_confirm: 'Yes, delete the row',
    },
  };
  const textResources: ITextResource[] = [{ id: 'option.label', value: 'Value to be shown' }];
  const attachments: IAttachments = {};
  const options: IOption[] = [{ value: 'option.value', label: 'option.label' }];
  const components: ExprUnresolved<ComponentInGroup>[] = [
    {
      id: 'field1',
      type: 'Input',
      dataModelBindings: {
        simpleBinding: 'Group.prop1',
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
        simpleBinding: 'Group.prop2',
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
        simpleBinding: 'Group.prop3',
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
    } as ExprUnresolved<ILayoutCompCheckboxes>,
  ];
  const layout: ILayoutState = getLayout(group, components);
  const data: IFormData = {
    'some-group[1].checkboxBinding': 'option.value',
  };

  const repeatingGroupIndex = 3;

  it('should render table header when table has entries', () => {
    // eslint-disable-next-line testing-library/render-result-naming-convention
    const container = render();
    // eslint-disable-next-line testing-library/no-node-access
    const tableHeader = container.querySelector(`#group-${group.id}-table-header`);
    expect(tableHeader).toBeInTheDocument();
  });

  it('should not render table header when table has no entries', () => {
    // eslint-disable-next-line testing-library/render-result-naming-convention
    const container = render({
      repeatingGroupIndex: -1,
    });
    // eslint-disable-next-line testing-library/no-node-access
    const tableHeader = container.querySelector(`#group-${group.id}-table-header`);
    expect(tableHeader).not.toBeInTheDocument();
  });

  describe('popOver warning', () => {
    it('should open and close delete-warning on delete click when alertOnDelete is active', async () => {
      const group: ExprUnresolved<ILayoutGroup> = getFormLayoutGroupMock({
        id: 'mock-container-id',
        edit: { alertOnDelete: true },
      });
      const layout = getLayout(group, components);

      if (!layout.layouts) {
        return;
      }

      render({}, layout);

      await act(() => user.click(screen.getAllByRole('button', { name: /delete/i })[0]));

      expect(screen.getByText('Are you sure you want to delete this row?')).toBeInTheDocument();

      await act(() => user.click(screen.getAllByRole('button', { name: /delete/i })[0]));

      expect(screen.queryByText('Are you sure you want to delete this row?')).not.toBeInTheDocument();
    });
  });

  describe('desktop view', () => {
    const { setScreenWidth } = mockMediaQuery(992);
    beforeEach(() => {
      setScreenWidth(1337);
    });

    it('should trigger onClickRemove on delete-button click', async () => {
      const onClickRemove = jest.fn();
      render({ onClickRemove });

      await act(() => user.click(screen.getAllByRole('button', { name: /delete/i })[0]));

      expect(onClickRemove).toBeCalledTimes(1);
    });

    it('should trigger setEditIndex on edit-button click', async () => {
      const setEditIndex = jest.fn();
      render({ setEditIndex });

      await act(() => user.click(screen.getAllByRole('button', { name: /edit/i })[0]));

      expect(setEditIndex).toBeCalledTimes(1);
    });
  });

  describe('mobile view', () => {
    const { setScreenWidth } = mockMediaQuery(768);
    beforeEach(() => {
      setScreenWidth(768);
    });

    it('should render edit and delete buttons as icons for screens smaller thnn 786px', () => {
      render();

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

  const render = (props: Partial<IRepeatingGroupTableProps> = {}, newLayout?: ILayoutState) => {
    const allProps: IRepeatingGroupTableProps = {
      ...({} as IRepeatingGroupTableProps),
      editIndex: -1,
      repeatingGroupIndex,
      deleting: false,
      onClickRemove: jest.fn(),
      setEditIndex: jest.fn(),
      ...props,
    };

    const preloadedState = getInitialStateMock();
    preloadedState.formLayout = newLayout || layout;
    preloadedState.attachments.attachments = attachments;
    preloadedState.textResources.resources = textResources;
    preloadedState.formData.formData = data;
    preloadedState.language.language = language;

    const { container } = renderWithProviders(
      <RenderGroupTable
        id={group.id}
        {...allProps}
      />,
      { preloadedState },
    );

    return container;
  };
});

function RenderGroupTable(props: IRepeatingGroupTableProps & { id: string }) {
  const node = useResolvedNode(props.id) as LayoutNode<HRepGroup, 'Group'>;

  return (
    <RepeatingGroupTable
      {...props}
      node={node}
    />
  );
}
