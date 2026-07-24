import React from 'react';

import { screen, waitFor } from '@testing-library/react';

import { getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { findElementToFocus } from 'src/layout/focusComponent';
import { GenericComponent } from 'src/layout/GenericComponent';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import type { CompExternal } from 'src/layout/layout';

const render = async (component: Partial<CompExternal> = {}, waitUntilLoaded = true) =>
  await renderWithInstanceAndLayout({
    renderer: <GenericComponent baseComponentId={component.id ?? 'mockId'} />,
    waitUntilLoaded,
    queries: {
      fetchFormBootstrapForInstance: async () =>
        getFormBootstrapMock((obj) => {
          obj.layouts = {
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
          };
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

describe('findElementToFocus', () => {
  function createContainer(innerHtml: string) {
    const div = document.createElement('div');
    div.innerHTML = innerHtml;
    return div as HTMLDivElement;
  }

  it('returns undefined when there are no focusable elements', () => {
    expect(findElementToFocus(createContainer('<p>test</p>'), null)).toBeUndefined();
  });

  it('prefers input-like elements when no binding is provided', () => {
    const div = createContainer(
      '<button id="button">Click me</button><input id="input" type="text" /><div tabindex="0"></div>',
    );

    expect(findElementToFocus(div, null)?.id).toBe('input');
  });

  it('prefers an input-like element matching the binding', () => {
    const div = createContainer(
      [
        '<input id="input" data-bindingkey="other" />',
        '<button data-bindingkey="target"></button>',
        '<textarea id="textarea" data-bindingkey="target"></textarea>',
      ].join(''),
    );

    expect(findElementToFocus(div, 'target')?.id).toBe('textarea');
  });

  it('falls back to any element matching the binding', () => {
    const div = createContainer('<button id="button" data-bindingkey="target"></button>');

    expect(findElementToFocus(div, 'target')?.id).toBe('button');
  });

  it('falls back to the first focusable element', () => {
    const div = createContainer('<button id="first"></button><button id="second"></button>');

    expect(findElementToFocus(div, 'missing')?.id).toBe('first');
  });
});
