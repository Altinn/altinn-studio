import React from 'react';

import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { PanelReferenceGroupContainer } from 'src/layout/Panel/PanelReferenceGroupContainer';
import { renderWithProviders } from 'src/testUtils';
import type { ExprUnresolved } from 'src/features/expressions/types';
import type { ILayoutState } from 'src/features/layout/formLayoutSlice';
import type { ILayoutGroup } from 'src/layout/Group/types';
import type { ILayout } from 'src/layout/layout';
import type { RootState } from 'src/redux/store';

describe('PanelGroupContainer', () => {
  const initialState = getInitialStateMock();
  const container: ExprUnresolved<ILayoutGroup> = {
    id: 'group',
    type: 'Group',
    children: ['input1', 'input2'],
    panel: {
      variant: 'info',
    },
  };

  const groupComponents: ILayout = [
    {
      id: 'input1',
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
      id: 'input2',
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
    layouts: {
      FormLayout: [],
    },
    uiConfig: {
      ...initialState.formLayout.uiConfig,
      hiddenFields: [],
      currentView: 'FormLayout',
    },
    error: null,
    layoutsets: null,
  };

  it('should display panel with group children', async () => {
    render({
      container,
      components: groupComponents,
      customState: {
        formLayout: state,
      },
    });

    const customIcon = screen.queryByTestId('panel-group-container');
    expect(customIcon).toBeInTheDocument();

    const firstInputTitle = screen.queryByText('Title for first input');
    expect(firstInputTitle).toBeInTheDocument();

    const secondInputTitle = screen.queryByText('Title for second input');
    expect(secondInputTitle).toBeInTheDocument();
  });

  it('should open panel when clicking add and close when clicking save,', async () => {
    const containerWithNoChildrenWithGroupReference: ExprUnresolved<ILayoutGroup> = {
      ...container,
      children: [],
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
    });

    const user = userEvent.setup();

    // save should not be present when panel is closed
    expect(screen.queryByText('Lagre')).not.toBeInTheDocument();

    await act(() => user.click(screen.getByText('Add new item')));

    // save should appear and add should be hidden
    expect(screen.getByText('Lagre')).toBeInTheDocument();

    expect(screen.queryByText('Add new item')).not.toBeInTheDocument();

    // pressing save should close panel and show add button again
    await act(() => user.click(screen.getByText('Lagre')));

    expect(screen.getByText('Add new item')).toBeInTheDocument();
  });

  it('should display nothing if group is hidden', async () => {
    const stateWithHidden: Partial<RootState> = {
      formLayout: {
        ...state,
        uiConfig: {
          ...state.uiConfig,
          hiddenFields: ['group'],
        },
      },
    };

    render({
      container,
      components: groupComponents,
      customState: stateWithHidden,
    });

    const customIcon = screen.queryByTestId('panel-group-container');
    expect(customIcon).not.toBeInTheDocument();
  });
});

interface TestProps {
  container: ExprUnresolved<ILayoutGroup>;
  components?: ILayout | undefined;
  customState?: Partial<RootState>;
}

const render = ({ container, components, customState }: TestProps) => {
  let preloadedState = getInitialStateMock() as RootState;
  preloadedState = {
    ...preloadedState,
    ...customState,
  };
  const formLayout = preloadedState.formLayout.layouts && preloadedState.formLayout.layouts['FormLayout'];
  container && formLayout?.push(container);
  formLayout?.push(...(components || []));
  formLayout?.push({
    id: 'referencedGroup',
    type: 'Group',
    dataModelBindings: {
      group: 'RefGroup',
    },
    maxCount: 99,
    children: [],
  });

  renderWithProviders(<PanelReferenceGroupContainer id={'group'} />, { preloadedState });
};
