import React from 'react';

import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { PanelGroupContainer } from 'src/layout/Panel/PanelGroupContainer';
import { renderWithProviders } from 'src/testUtils';
import type { ExprUnresolved } from 'src/features/expressions/types';
import type { ILayoutState } from 'src/features/form/layout/formLayoutSlice';
import type { ILayoutGroup } from 'src/layout/Group/types';
import type { ILayout } from 'src/layout/layout';
import type { IPanelGroupContainerProps } from 'src/layout/Panel/PanelGroupContainer';
import type { RootState } from 'src/store';

describe('PanelGroupContainer', () => {
  const initialState = getInitialStateMock();
  const container: ExprUnresolved<ILayoutGroup> = {
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

  const state: ILayoutState = {
    layouts: null,
    uiConfig: {
      ...initialState.formLayout.uiConfig,
      hiddenFields: [],
      currentView: 'FormLayout',
    },
    error: null,
    layoutsets: null,
  };

  it('should display panel with group children', async () => {
    render(
      {
        container,
        components: groupComponents,
      },
      { formLayout: state },
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
    const containerWithGroupReference: ExprUnresolved<ILayoutGroup> = {
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

    const addNewButton = await screen.getByText('Add new item');
    await act(() => user.click(addNewButton));

    const inputFieldTitle = await screen.queryByText('The value from the group is: Value from input field [2]');
    expect(inputFieldTitle).toBeInTheDocument();
  });

  it('should display panel with referenced group children if no children is supplied', async () => {
    const containerWithNoChildrenWithGroupReference: ExprUnresolved<ILayoutGroup> = {
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
      container: containerWithNoChildrenWithGroupReference,
      components: undefined,
    });

    const user = userEvent.setup();

    const addNewButton = await screen.getByText('Add new item');
    await act(() => user.click(addNewButton));

    const firstInputTitle = await screen.queryByText('Referenced Group Input');
    expect(firstInputTitle).toBeInTheDocument();
  });

  it('should open panel when clicking add and close when clicking save,', async () => {
    const containerWithNoChildrenWithGroupReference: ExprUnresolved<ILayoutGroup> = {
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
      container: containerWithNoChildrenWithGroupReference,
      components: undefined,
    });

    const user = userEvent.setup();

    // save should not be present when panel is closed
    expect(await screen.queryByText('Lagre')).not.toBeInTheDocument();

    await act(async () => user.click(await screen.getByText('Add new item')));

    // save should appear and add should be hidden
    expect(await screen.getByText('Lagre')).toBeInTheDocument();

    expect(await screen.queryByText('Add new item')).not.toBeInTheDocument();

    // pressing save should close panel and show add button again
    await act(async () => user.click(await screen.getByText('Lagre')));

    expect(await screen.getByText('Add new item')).toBeInTheDocument();
  });

  it('should display nothing if group is hidden', async () => {
    const stateWithHidden: Partial<RootState> = {
      formLayout: {
        ...state,
        uiConfig: {
          ...state.uiConfig,
          hiddenFields: ['group-id'],
        },
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
      { formLayout: state },
    );

    const customIcon = await screen.queryByTestId('custom-icon');
    expect(customIcon).toBeInTheDocument();

    const altText = await screen.queryByAltText('some alt text');
    expect(altText).toBeInTheDocument();
  });
});

const render = (props: Partial<IPanelGroupContainerProps> = {}, customState: Partial<RootState> = {}) => {
  const allProps: IPanelGroupContainerProps = {
    ...({} as IPanelGroupContainerProps),
    ...props,
  };

  let preloadedState = getInitialStateMock() as RootState;
  preloadedState = {
    ...preloadedState,
    ...customState,
  };
  const formLayout = preloadedState.formLayout.layouts && preloadedState.formLayout.layouts['FormLayout'];
  formLayout?.push(allProps.container, ...(allProps.components || []));

  const { container } = renderWithProviders(<PanelGroupContainer {...allProps} />, { preloadedState });

  return container;
};
