import React from 'react';

import { screen, waitFor } from '@testing-library/react';

import { GenericComponent } from 'src/layout/GenericComponent';
import { renderWithNode } from 'src/test/renderWithProviders';
import type { CompExternal } from 'src/layout/layout';

const render = async (component: Partial<CompExternal> = {}, waitUntilLoaded = true) =>
  await renderWithNode({
    nodeId: component.id || 'mockId',
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
                triggers: [],
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
    const spy = jest.spyOn(window, 'logWarnOnce').mockImplementation().mockName('window.logWarnOnce');
    await render({ type: 'unknown-type' as any }, false);
    await waitFor(() => expect(spy).toHaveBeenCalledWith(`No component definition found for type 'unknown-type'`), {
      timeout: 15000,
    });
  });

  it('should render Input component when passing Input type', async () => {
    await render({ type: 'Input' });

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.queryByText(/unknown component type/i)).not.toBeInTheDocument();
  });

  it('should render description and label when textResourceBindings includes description and title', async () => {
    await render({
      type: 'Input',
      textResourceBindings: {
        title: 'titleKey',
        description: 'descriptionKey',
      },
    });

    expect(screen.getByTestId('description-mockId')).toBeInTheDocument();
    expect(screen.getByTestId('label-mockId')).toBeInTheDocument();
  });

  it('should not render description and label when textResourceBindings does not include description and title', async () => {
    await render({
      type: 'Input',
      textResourceBindings: {},
    });

    expect(screen.queryByTestId('description-mockId')).not.toBeInTheDocument();
    expect(screen.queryByTestId('label-mockId')).not.toBeInTheDocument();
  });

  it('should not render description and label when textResourceBindings includes description and title, but the component is listed in "noLabelComponents"', async () => {
    await render({
      type: 'NavigationBar',
      textResourceBindings: {
        title: 'titleKey',
        description: 'descriptionKey',
      },
    } as any);

    expect(screen.queryByTestId('description-mockId')).not.toBeInTheDocument();
    expect(screen.queryByTestId('label-mockId')).not.toBeInTheDocument();
  });
});
