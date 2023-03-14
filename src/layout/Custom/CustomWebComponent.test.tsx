import React from 'react';

import { screen } from '@testing-library/react';

import { CustomWebComponent } from 'src/layout/Custom/CustomWebComponent';
import { renderGenericComponentTest } from 'src/testUtils';
import type { RenderGenericComponentTestProps } from 'src/testUtils';
import type { ITextResource } from 'src/types/shared';

const jsonAttributeValue = { customKey: 'customValue' };

describe('CustomWebComponent', () => {
  it('should render the component with the provided tag name', () => {
    render({ component: { tagName: 'test-component' } });
    const element = screen.getByTestId('test-component');
    expect(element).toBeInTheDocument();
  });

  it('should stringify json values when passed to the dom', () => {
    render({ component: { tagName: 'test-component' } });
    const element = screen.getByTestId('test-component');
    expect(element.id).toEqual('test-component');
    expect(element.getAttribute('data-CustomAttributeWithJson')).toEqual(JSON.stringify(jsonAttributeValue));
    expect(element.getAttribute('data-CustomAttributeWithReact')).toEqual('<span>Hello world</span>');
  });

  it('should render the component with passed props as attributes', () => {
    render({ component: { tagName: 'test-component' } });
    const element = screen.getByTestId('test-component');
    expect(element.id).toEqual('test-component');
    expect(element.getAttribute('text')).toEqual('Title');
  });

  it('should render nothing if the tag name is missing', () => {
    render({ component: { tagName: undefined } });
    const element = screen.queryByTestId('test-component');
    expect(element).not.toBeInTheDocument();
  });

  const render = ({ component }: Partial<RenderGenericComponentTestProps<'Custom'>> = {}) => {
    const resources = [
      {
        id: 'title',
        value: 'Title',
      },
    ] as ITextResource[];

    renderGenericComponentTest({
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
        text: 'Title',
        handleDataChange: (value: string) => value,
        getTextResource: (key: string) => key,
        getTextResourceAsString: (key: string) => key,
        isValid: true,
        language: {},
        shouldFocus: false,
        ...({ 'data-CustomAttributeWithReact': <span>Hello world</span> } as any),
      },
      manipulateState: (state) => {
        state.textResources = {
          language: 'nb',
          resources,
          error: null,
        };
      },
    });
  };
});
