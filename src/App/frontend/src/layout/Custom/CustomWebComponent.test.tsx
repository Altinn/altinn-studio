import React from 'react';

import { screen } from '@testing-library/react';

import { CustomWebComponent } from 'src/layout/Custom/CustomWebComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { RenderGenericComponentTestProps } from 'src/test/renderWithProviders';

const jsonAttributeValue = { customKey: 'customValue' };

describe('CustomWebComponent', () => {
  it('should render the component with the provided tag name', async () => {
    await render({ component: { tagName: 'test-component' } });
    const element = screen.getByTestId('test-component');
    expect(element).toBeInTheDocument();
  });

  it('should stringify json values when passed to the dom', async () => {
    await render({ component: { tagName: 'test-component' } });
    const element = screen.getByTestId('test-component');
    expect(element.id).toEqual('test-component');
    expect(element.getAttribute('data-CustomAttributeWithJson')).toEqual(JSON.stringify(jsonAttributeValue));
    expect(element.getAttribute('data-CustomAttributeWithReact')).toEqual('<span>Hello world</span>');
  });

  it('should render the component with passed props as attributes', async () => {
    await render({ component: { tagName: 'test-component' } });
    const element = screen.getByTestId('test-component');
    expect(element.id).toEqual('test-component');
    expect(element.getAttribute('text')).toEqual('Title');
  });

  it('should render nothing if the tag name is missing', async () => {
    await render({ component: { tagName: undefined } });
    const element = screen.queryByTestId('test-component');
    expect(element).not.toBeInTheDocument();
  });

  const render = async ({ component }: Partial<RenderGenericComponentTestProps<'Custom'>> = {}) => {
    await renderGenericComponentTest({
      type: 'Custom',
      renderer: (props) => <CustomWebComponent {...props} />,
      component: {
        id: 'test-component',
        tagName: '',
        dataModelBindings: { simpleBinding: 'model' },
        textResourceBindings: {
          title: 'title',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({ 'data-CustomAttributeWithJson': jsonAttributeValue } as any),
        ...component,
      },
      genericProps: {
        isValid: true,
        shouldFocus: false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({ 'data-CustomAttributeWithReact': <span>Hello world</span> } as any),
      },
      queries: {
        fetchTextResources: async () => ({
          language: 'nb',
          resources: [
            {
              id: 'title',
              value: 'Title',
            },
          ],
        }),
      },
    });
  };
});
