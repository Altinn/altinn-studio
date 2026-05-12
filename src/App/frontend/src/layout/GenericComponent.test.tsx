import React from 'react';

import { screen, waitFor } from '@testing-library/react';

import { getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { findElementToFocus, GenericComponent } from 'src/layout/GenericComponent';
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
    const div = createContainer('<p>test</p>');
    const result = findElementToFocus(div, null);
    expect(result).toBeUndefined();
  });

  it('prefers input/textarea/select over other focusable elements when no binding is provided', () => {
    const div = createContainer(
      '<button id="button">Click me</button><input id="input" type="text" /><div tabindex="0" id="tabindex-div"></div>',
    );

    const result = findElementToFocus(div, null);
    expect(result).toBeInstanceOf(HTMLInputElement);
    expect(result?.id).toBe('input');
  });

  it('prefers element matching binding on an input-like element', () => {
    const div = createContainer(
      [
        '<input id="input1" type="text" data-bindingkey="otherBinding" />',
        '<button id="button" data-bindingkey="targetBinding"></button>',
        '<textarea id="textarea" data-bindingkey="targetBinding"></textarea>',
      ].join(''),
    );
    const result = findElementToFocus(div, 'targetBinding');
    expect(result).toBeInstanceOf(HTMLTextAreaElement);
    expect(result?.id).toBe('textarea');
  });

  it('falls back to any element matching binding when no input-like element matches', () => {
    const div = createContainer(
      [
        '<button id="button1" data-bindingkey="targetBinding"></button>',
        '<div id="div" tabindex="0" data-bindingkey="targetBinding"></div>',
      ].join(''),
    );

    const result = findElementToFocus(div, 'targetBinding');
    expect(result).toBeInstanceOf(HTMLButtonElement);
    expect(result?.id).toBe('button1');
  });

  it('falls back to the first focusable element when there is no binding match', () => {
    const div = createContainer(
      '<button id="button1"></button><div id="div" tabindex="0"></div><button id="button2"></button>',
    );

    const result = findElementToFocus(div, 'nonExistingBinding');
    expect(result).toBeInstanceOf(HTMLButtonElement);
    expect(result?.id).toBe('button1');
  });
});
