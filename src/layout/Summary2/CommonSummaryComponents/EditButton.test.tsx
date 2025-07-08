import React from 'react';

import { screen } from '@testing-library/react';

import { EditButton } from 'src/layout/Summary2/CommonSummaryComponents/EditButton';
import { renderWithNode } from 'src/test/renderWithProviders';
import type { CompExternal, ILayoutCollection } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

describe('EditButton', () => {
  const layoutMock = (readOnly = false): ILayoutCollection => ({
    FormLayout: {
      data: {
        layout: [
          {
            id: 'TestInput',
            type: 'Input',
            dataModelBindings: { simpleBinding: { field: 'field' } },
            textResourceBindings: {},
            readOnly,
          } as CompExternal,
        ],
      },
    },
  });

  test('should return null when component is readOnly', async () => {
    await renderWithNode<true, LayoutNode<'Input'>>({
      nodeId: 'TestInput',
      inInstance: true,
      renderer: ({ node }) => <EditButton targetBaseComponentId={node.baseId} />,
      queries: {
        fetchLayouts: async () => layoutMock(true),
      },
    });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  test('should render edit button when component is not readOnly', async () => {
    await renderWithNode<true, LayoutNode<'Input'>>({
      nodeId: 'TestInput',
      inInstance: true,
      renderer: ({ node }) => <EditButton targetBaseComponentId={node.baseId} />,
      queries: {
        fetchLayouts: async () => layoutMock(false),
      },
    });

    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
