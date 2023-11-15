import React from 'react';

import { screen } from '@testing-library/react';

import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { CustomWebComponent } from 'src/layout/Custom/CustomWebComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { TextResourceMap } from 'src/features/textResources';
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
    const resourceMap = {
      title: {
        value: 'Title',
      },
    } as TextResourceMap;

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
        ...({ 'data-CustomAttributeWithJson': jsonAttributeValue } as any),
        ...component,
      },
      genericProps: {
        formData: { simpleBinding: 'This is a test' },
        handleDataChange: (value: string) => value,
        isValid: true,
        shouldFocus: false,
        ...({ 'data-CustomAttributeWithReact': <span>Hello world</span> } as any),
      },
      reduxState: {
        ...getInitialStateMock(),
        textResources: {
          language: 'nb',
          resourceMap,
          error: null,
        },
      },
    });
  };
});
