import React from 'react';
import type { PreloadedState } from 'redux';
import { renderWithProviders } from 'src/../testUtils';
import { getInitialStateMock } from '__mocks__/initialStateMock';
import type { IPanelGroupContainerProps } from './PanelGroupContainer';
import { PanelGroupContainer } from './PanelGroupContainer';
import type { RootState } from 'src/store';
import type { ILayout, ILayoutGroup } from '../layout';
import type { ILayoutState } from '../layout/formLayoutSlice';
import { screen } from '@testing-library/react';
import type { IUiConfig } from 'src/types';
import userEvent from '@testing-library/user-event';

describe('PanelGroupContainer', () => {
  const container: ILayoutGroup = {
    id: 'group-id',
    type: 'Group',
    children: ['input-1', 'input-2'],
    panel: {
      variant: 'info',
    },
  };

  const groupComponents: ILayout = [
    {
      id: 'input-1',
      type: 'Input',
      dataModelBindings: {
        simpleBinding: 'something',
      },
      textResourceBindings: {
        title: 'Title for first input',
      },
      readOnly: false,
      required: false,
      disabled: false,
    },
    {
      id: 'input-2',
      type: 'Input',
      dataModelBindings: {
        simpleBinding: 'something.else',
      },
      textResourceBindings: {
        title: 'Title for second input',
      },
      readOnly: false,
      required: false,
      disabled: false,
    },
  ];

  const state: PreloadedState<RootState> = {
    formLayout: {
      layouts: {
        FormLayout: [container, ...groupComponents],
      },
      uiConfig: {
        hiddenFields: [],
        currentView: 'FormLayout',
      } as IUiConfig,
      error: null,
      layoutsets: null,
    } as ILayoutState,
  };

  it('should display panel with group children', async () => {
    render(
      {
        container,
        components: groupComponents,
      },
      state,
    );

    const customIcon = await screen.queryByTestId('panel-group-container');
    expect(customIcon).toBeInTheDocument();

    const firstInputTitle = await screen.queryByText('Title for first input');
    expect(firstInputTitle).toBeInTheDocument();

    const secondInputTitle = await screen.queryByText('Title for second input');
    expect(secondInputTitle).toBeInTheDocument();
  });

  it('should display panel with group children when referencing another group with correct index reference', async () => {
    const components: ILayout = [
      {
        id: 'input-1',
        type: 'Input',
        dataModelBindings: {
          simpleBinding: 'referencedGroup.inputField',
        },
        textResourceBindings: {
          title: 'group.input.title',
        },
        readOnly: false,
        required: false,
        disabled: false,
      },
    ];
    const containerWithGroupReference: ILayoutGroup = {
      ...container,
      textResourceBindings: {
        add_label: 'Add new item',
      },
      panel: {
        ...container.panel,
        groupReference: {
          group: 'referencedGroup',
        },
      },
    };

    render({
      container: containerWithGroupReference,
      components,
    });

    const user = userEvent.setup();

    const addNewButton = await screen.queryByText('Add new item');
    await user.click(addNewButton);

    const inputFieldTitle = await screen.queryByText(
      'The value from the group is: Value from input field [2]',
    );
    expect(inputFieldTitle).toBeInTheDocument();
  });

  it('should display panel with referenced group children if no children is supplied', async () => {
    const containerWithNoChildrenWithGroupReference: ILayoutGroup = {
      ...container,
      children: undefined,
      textResourceBindings: {
        add_label: 'Add new item',
      },
      panel: {
        ...container.panel,
        groupReference: {
          group: 'referencedGroup',
        },
      },
    };

    render({
      container: containerWithNoChildrenWithGroupReference,
      components: undefined,
    });

    const user = userEvent.setup();

    const addNewButton = await screen.queryByText('Add new item');
    await user.click(addNewButton);

    const firstInputTitle = await screen.queryByText('Referenced Group Input');
    expect(firstInputTitle).toBeInTheDocument();
  });

  it('should open panel when clicking add and close when clicking save,', async () => {
    const containerWithNoChildrenWithGroupReference: ILayoutGroup = {
      ...container,
      children: undefined,
      textResourceBindings: {
        add_label: 'Add new item',
      },
      panel: {
        ...container.panel,
        groupReference: {
          group: 'referencedGroup',
        },
      },
    };

    render({
      container: containerWithNoChildrenWithGroupReference,
      components: undefined,
    });

    const user = userEvent.setup();

    // save should not be present when panel is closed
    let saveButton = await screen.queryByText('Lagre');
    expect(saveButton).not.toBeInTheDocument();

    let addNewButton = await screen.queryByText('Add new item');
    await user.click(addNewButton);

    // save should appear and add should be hidden
    saveButton = await screen.queryByText('Lagre');
    expect(saveButton).toBeInTheDocument();

    addNewButton = await screen.queryByText('Add new item');
    expect(addNewButton).not.toBeInTheDocument();

    // pressing save should close panel and show add button again
    await user.click(saveButton);

    addNewButton = await screen.queryByText('Add new item');
    expect(addNewButton).toBeInTheDocument();
  });

  it('should display nothing if group is hidden', async () => {
    const stateWithHidden: PreloadedState<RootState> = {
      formLayout: {
        ...state.formLayout,
        uiConfig: {
          ...state.formLayout.uiConfig,
          hiddenFields: ['group-id'],
        } as IUiConfig,
      },
    };

    render(
      {
        container,
        components: groupComponents,
      },
      stateWithHidden,
    );

    const customIcon = await screen.queryByTestId('panel-group-container');
    expect(customIcon).not.toBeInTheDocument();
  });

  it('should display custom icon if supplied', async () => {
    const containerWithCustomIcon = {
      ...container,
      panel: {
        ...container.panel,
        iconUrl: 'someIcon.svg',
        iconAlt: 'some alt text',
      },
    };

    render(
      {
        container: containerWithCustomIcon,
        components: groupComponents,
      },
      state,
    );

    const customIcon = await screen.queryByTestId('custom-icon');
    expect(customIcon).toBeInTheDocument();

    const altText = await screen.queryByAltText('some alt text');
    expect(altText).toBeInTheDocument();
  });
});

const render = (
  props: Partial<IPanelGroupContainerProps> = {},
  customState: PreloadedState<RootState> = {},
) => {
  const allProps: IPanelGroupContainerProps = {
    ...({} as IPanelGroupContainerProps),
    ...props,
  };

  const { container } = renderWithProviders(
    <PanelGroupContainer {...allProps} />,
    {
      preloadedState: {
        ...getInitialStateMock(),
        ...customState,
      },
    },
  );

  return container;
};
