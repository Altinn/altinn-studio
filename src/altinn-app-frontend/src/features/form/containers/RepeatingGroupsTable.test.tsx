import * as React from 'react';

import { getFormLayoutGroupMock } from '__mocks__/mocks';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockMediaQuery, renderWithProviders } from 'testUtils';

import { RepeatingGroupTable } from 'src/features/form/containers/RepeatingGroupTable';
import { createRepeatingGroupComponents } from 'src/utils/formLayout';
import type { IRepeatingGroupTableProps } from 'src/features/form/containers/RepeatingGroupTable';
import type { IFormData } from 'src/features/form/data';
import type {
  ILayoutComponent,
  ILayoutGroup,
  ISelectionComponentProps,
} from 'src/features/form/layout';
import type { ILayoutState } from 'src/features/form/layout/formLayoutSlice';
import type { IAttachments } from 'src/shared/resources/attachments';
import type { IOption, ITextResource } from 'src/types';

import type { ILanguage } from 'altinn-shared/types';

const user = userEvent.setup();

describe('RepeatingGroupTable', () => {
  const group: ILayoutGroup = getFormLayoutGroupMock({});
  const language: ILanguage = {
    general: {
      delete: 'Delete',
      edit_alt: 'Edit',
    },
  };
  const textResources: ITextResource[] = [
    { id: 'option.label', value: 'Value to be shown' },
  ];
  const attachments: IAttachments = {};
  const options: IOption[] = [{ value: 'option.value', label: 'option.label' }];
  const components: ILayoutComponent[] = [
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
      disabled: false,
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
      disabled: false,
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
      disabled: false,
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
      disabled: false,
      options: options,
    } as ISelectionComponentProps,
  ];
  const layout: ILayoutState = {
    layouts: {
      FormLayout: [].concat(group).concat(components),
    },
    uiConfig: {
      hiddenFields: [],
      repeatingGroups: {
        'mock-container-id': {
          index: 3,
        },
      },
      autoSave: false,
      currentView: 'FormLayout',
      focus: undefined,
      layoutOrder: ['FormLayout'],
    },
    error: null,
    layoutsets: null,
  };
  const currentView = 'FormLayout';
  const data: IFormData = {
    'some-group[1].checkboxBinding': 'option.value',
  };

  const repeatingGroupIndex = 3;
  const repeatingGroupDeepCopyComponents: Array<
    Array<ILayoutComponent | ILayoutGroup>
  > = createRepeatingGroupComponents(
    group,
    components,
    repeatingGroupIndex,
    textResources,
  );

  it('should render table header when table has entries', () => {
    const container = render();
    const tableHeader = container.querySelector(
      `#group-${group.id}-table-header`,
    );
    expect(tableHeader).toBeInTheDocument();
  });

  it('should not render table header when table has no entries', () => {
    const container = render({
      repeatingGroupIndex: -1,
    });
    const tableHeader = container.querySelector(
      `#group-${group.id}-table-header`,
    );
    expect(tableHeader).not.toBeInTheDocument();
  });

  describe('desktop view', () => {
    const { setScreenWidth } = mockMediaQuery(992);
    beforeEach(() => {
      setScreenWidth(1337);
    });

    it('should trigger onClickRemove on delete-button click', async () => {
      const onClickRemove = jest.fn();
      render({ onClickRemove: onClickRemove });

      await user.click(screen.getAllByRole('button', { name: /delete/i })[0]);

      expect(onClickRemove).toBeCalledTimes(1);
    });

    it('should trigger setEditIndex on edit-button click', async () => {
      const setEditIndex = jest.fn();
      render({ setEditIndex: setEditIndex });

      await user.click(screen.getAllByRole('button', { name: /edit/i })[0]);

      expect(setEditIndex).toBeCalledTimes(1);
    });
  });

  describe('tablet view', () => {
    const { setScreenWidth } = mockMediaQuery(992);
    beforeEach(() => {
      setScreenWidth(992);
    });

    it('should render as mobile-version for small screens', () => {
      render();

      const altinnMobileTable = screen.queryByTestId(/altinn-mobile-table/i);

      expect(altinnMobileTable).toBeInTheDocument();
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

  const render = (props: Partial<IRepeatingGroupTableProps> = {}) => {
    const allProps: IRepeatingGroupTableProps = {
      container: group,
      attachments: attachments,
      language: language,
      textResources: textResources,
      components: components,
      currentView: currentView,
      editIndex: -1,
      formData: data,
      hiddenFields: [],
      id: group.id,
      layout: layout.layouts[currentView],
      options: {},
      repeatingGroupDeepCopyComponents: repeatingGroupDeepCopyComponents,
      repeatingGroupIndex: repeatingGroupIndex,
      repeatingGroups: layout.uiConfig.repeatingGroups,
      deleting: false,
      onClickRemove: jest.fn(),
      setEditIndex: jest.fn(),
      validations: {},
      ...props,
    };

    const { container } = renderWithProviders(
      <RepeatingGroupTable {...allProps} />,
    );

    return container;
  };
});
