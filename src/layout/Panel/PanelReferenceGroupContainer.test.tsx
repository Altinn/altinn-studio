import React from 'react';

import { act, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

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

  it('should open panel when clicking add and close when clicking save,', async () => {
    const containerWithNoChildrenWithGroupReference: CompGroupNonRepeatingPanelExternal = {
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

    await render({
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
    await render({
      container: { ...container, hidden: true },
      components: groupComponents,
    });

    const customIcon = screen.queryByTestId('panel-group-container');
    expect(customIcon).not.toBeInTheDocument();
  });
});

interface TestProps {
  container: CompGroupNonRepeatingPanelExternal;
  components?: ILayout | undefined;
}

const render = async ({ container, components }: TestProps) => {
  await renderWithNode<true, LayoutNodeForGroup<CompGroupNonRepeatingPanelInternal>>({
    nodeId: 'group',
    inInstance: true,
    renderer: ({ node }) => <PanelReferenceGroupContainer node={node} />,
    queries: {
      fetchLayouts: async () => ({
        FormLayout: {
          data: {
            layout: [
              container,
              ...(components || []),
              {
                id: 'referencedGroup',
                type: 'Group',
                dataModelBindings: {
                  group: 'RefGroup',
                },
                maxCount: 99,
                children: [],
              },
            ],
          },
        },
      }),
    },
  });
};
