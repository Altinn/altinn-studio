import React from 'react';

import { screen } from '@testing-library/react';

import { PanelReferenceGroupContainer } from 'src/layout/Panel/PanelReferenceGroupContainer';
import { renderWithNode } from 'src/test/renderWithProviders';
import type {
  CompGroupNonRepeatingPanelExternal,
  CompGroupNonRepeatingPanelInternal,
} from 'src/layout/Group/config.generated';
import type { LayoutNodeForGroup } from 'src/layout/Group/LayoutNodeForGroup';
import type { ILayout } from 'src/layout/layout';

describe('PanelGroupContainer', () => {
  const container: CompGroupNonRepeatingPanelExternal = {
    id: 'group',
    type: 'Group',
    children: ['input1', 'input2'],
    textResourceBindings: {
      title: 'Title for PanelGoup',
      description: 'Description for PanelGroup',
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

  it('should display panel with group children', async () => {
    await render({
      container,
      components: groupComponents,
    });

    const customIcon = screen.queryByTestId('panel-group-container');
    expect(customIcon).toBeInTheDocument();

    const firstInputTitle = screen.queryByText('Title for first input');
    expect(firstInputTitle).toBeInTheDocument();

    const secondInputTitle = screen.queryByText('Title for second input');
    expect(secondInputTitle).toBeInTheDocument();
  });

  it('should display title and description', async () => {
    await render({
      container,
      components: groupComponents,
    });

    const title = screen.queryByText('Title for PanelGoup');
    expect(title).toBeInTheDocument();

    const description = screen.queryByText('Description for PanelGroup');
    expect(description).toBeInTheDocument();
  });
});

interface TestProps {
  container: CompGroupNonRepeatingPanelExternal;
  components?: ILayout | undefined;
}

const render = async ({ container, components }: TestProps) =>
  await renderWithNode<true, LayoutNodeForGroup<CompGroupNonRepeatingPanelInternal>>({
    nodeId: 'group',
    inInstance: true,
    renderer: ({ node }) => <PanelReferenceGroupContainer node={node} />,
    queries: {
      fetchLayouts: async () => ({
        FormLayout: {
          data: {
            layout: [container, ...(components || [])],
          },
        },
      }),
    },
  });
