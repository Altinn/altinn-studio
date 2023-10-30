import React from 'react';

import { screen } from '@testing-library/react';

import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { PanelReferenceGroupContainer } from 'src/layout/Panel/PanelReferenceGroupContainer';
import { renderWithProviders } from 'src/test/renderWithProviders';
import { useResolvedNode } from 'src/utils/layout/ExprContext';
import type { ILayoutState } from 'src/features/layout/formLayoutSlice';
import type {
  CompGroupNonRepeatingPanelExternal,
  CompGroupNonRepeatingPanelInternal,
} from 'src/layout/Group/config.generated';
import type { LayoutNodeForGroup } from 'src/layout/Group/LayoutNodeForGroup';
import type { ILayout } from 'src/layout/layout';
import type { RootState } from 'src/redux/store';

describe('PanelGroupContainer', () => {
  const initialState = getInitialStateMock();
  const container: CompGroupNonRepeatingPanelExternal = {
    id: 'group',
    type: 'Group',
    children: ['input1', 'input2'],
    textResourceBindings: {
      title: 'Title for PanelGoup',
      body: 'Body for PanelGroup',
    },
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
    },
  ];

  const state: ILayoutState = {
    layouts: {
      FormLayout: [],
    },
    layoutSetId: null,
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

  it('should display title and body', async () => {
    render({
      container,
      components: groupComponents,
      customState: {
        formLayout: state,
      },
    });

    const title = screen.queryByText('Title for PanelGoup');
    expect(title).toBeInTheDocument();

    const body = screen.queryByText('Body for PanelGroup');
    expect(body).toBeInTheDocument();
  });
});

interface TestProps {
  container: CompGroupNonRepeatingPanelExternal;
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

  renderWithProviders(<WrappedComponent id={'group'} />, { preloadedState });
};

const WrappedComponent = ({ id }: { id: string }) => {
  const node = useResolvedNode(id);
  if (!node) {
    throw new Error(`Could not find node with id ${id}`);
  }

  return <PanelReferenceGroupContainer node={node as LayoutNodeForGroup<CompGroupNonRepeatingPanelInternal>} />;
};
