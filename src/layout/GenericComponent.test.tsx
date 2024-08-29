import React from 'react';

import { jest } from '@jest/globals';
import { screen, waitFor } from '@testing-library/react';

import { GenericComponent } from 'src/layout/GenericComponent';
import { renderWithNode } from 'src/test/renderWithProviders';
import type { CompExternal } from 'src/layout/layout';

const render = async (component: Partial<CompExternal> = {}, waitUntilLoaded = true) =>
  await renderWithNode({
    nodeId: component.id ?? 'mockId',
    renderer: ({ node }) => <GenericComponent node={node} />,
    waitUntilLoaded,
    inInstance: true,
    queries: {
      fetchLayouts: async () => ({
        FormLayout: {
          data: {
            layout: [
              {
                type: 'Input',
                id: 'mockId',
                dataModelBindings: {
                  simpleBinding: 'mockDataBinding',
                },
                readOnly: false,
                required: false,
                disabled: false,
                textResourceBindings: {},
                grid: {
                  xs: 12,
                  sm: 10,
                  md: 8,
                  lg: 6,
                  xl: 4,
                  innerGrid: {
                    xs: 11,
                    sm: 9,
                    md: 7,
                    lg: 5,
                    xl: 3,
                  },
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ...(component as any),
              },
            ],
          },
        },
      }),
    },
  });

describe('GenericComponent', () => {
  it('should show an error in the logs when rendering an unknown component type', async () => {
    const spy = jest
      .spyOn(window, 'logError')
      .mockImplementation(() => {})
      .mockName('window.logError');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await render({ type: 'unknown-type' as any }, false);
    await waitFor(
      () =>
        expect(spy).toHaveBeenCalledWith(`No component definition found for type 'unknown-type' (component 'mockId')`),
      {
        timeout: 15000,
      },
    );
  });

  it('should render Input component when passing Input type', async () => {
    await render({ type: 'Input' });

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.queryByText(/unknown component type/i)).not.toBeInTheDocument();
  });
});
