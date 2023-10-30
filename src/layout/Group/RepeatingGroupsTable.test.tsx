import React from 'react';

import { act, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import ResizeObserverModule from 'resize-observer-polyfill';

import { getFormLayoutGroupMock } from 'src/__mocks__/formLayoutGroupMock';
import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { RepeatingGroupTable } from 'src/layout/Group/RepeatingGroupTable';
import { mockMediaQuery } from 'src/test/mockMediaQuery';
import { renderWithProviders } from 'src/test/renderWithProviders';
import { useResolvedNode } from 'src/utils/layout/ExprContext';
import type { IAttachments } from 'src/features/attachments';
import type { IFormData } from 'src/features/formData';
import type { ILayoutState } from 'src/features/layout/formLayoutSlice';
import type { TextResourceMap } from 'src/features/textResources';
import type { CompCheckboxesExternal } from 'src/layout/Checkboxes/config.generated';
import type { IOption } from 'src/layout/common.generated';
import type { CompGroupRepeatingExternal, CompGroupRepeatingInternal } from 'src/layout/Group/config.generated';
import type { LayoutNodeForGroup } from 'src/layout/Group/LayoutNodeForGroup';
import type { IRepeatingGroupTableProps } from 'src/layout/Group/RepeatingGroupTable';
import type { CompOrGroupExternal } from 'src/layout/layout';

(global as any).ResizeObserver = ResizeObserverModule;

const user = userEvent.setup();

const getLayout = (group: CompGroupRepeatingExternal, components: CompOrGroupExternal[]) => {
  const layout: ILayoutState = {
    layouts: {
      FormLayout: [group, ...components],
    },
    layoutSetId: null,
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
  const group = getFormLayoutGroupMock({
    id: 'mock-container-id',
  });
  const textResources: TextResourceMap = { 'option.label': { value: 'Value to be shown' } };
  const attachments: IAttachments = {};
  const options: IOption[] = [{ value: 'option.value', label: 'option.label' }];
  const components: CompOrGroupExternal[] = [
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
    } as CompCheckboxesExternal,
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
      const group = getFormLayoutGroupMock({
        id: 'mock-container-id',
        edit: { alertOnDelete: true },
      });
      const layout = getLayout(group, components);

      if (!layout.layouts) {
        return;
      }

      render({}, layout);

      await act(() => user.click(screen.getAllByRole('button', { name: /slett/i })[0]));

      expect(screen.getByText('Er du sikker på at du vil slette denne raden?')).toBeInTheDocument();

      await act(() => user.click(screen.getAllByRole('button', { name: /avbryt/i })[0]));

      expect(screen.queryByText('Er du sikker på at du vil slette denne raden?')).not.toBeInTheDocument();
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

      await act(() => user.click(screen.getAllByRole('button', { name: /slett/i })[0]));

      expect(onClickRemove).toBeCalledTimes(1);
    });

    it('should trigger setEditIndex on edit-button click', async () => {
      const setEditIndex = jest.fn();
      render({ setEditIndex });

      await act(() => user.click(screen.getAllByRole('button', { name: /rediger/i })[0]));

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
    preloadedState.textResources.resourceMap = textResources;
    preloadedState.formData.formData = data;

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
  const node = useResolvedNode(props.id) as LayoutNodeForGroup<CompGroupRepeatingInternal>;

  return (
    <RepeatingGroupTable
      {...props}
      node={node}
    />
  );
}
