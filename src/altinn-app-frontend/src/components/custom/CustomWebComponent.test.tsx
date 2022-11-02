import React from 'react';

import { mockComponentProps, renderWithProviders } from 'testUtils';

import CustomWebComponent from 'src/components/custom/CustomWebComponent';
import type { ICustomComponentProps } from 'src/components/custom/CustomWebComponent';

import type { ITextResource } from 'altinn-shared/types';

const jsonAttributeValue = { customKey: 'customValue' };

describe('CustomWebComponent', () => {
  it('should render the component with the provided tag name', () => {
    const screen = render({ tagName: 'test-component' });
    const element = screen.getByTestId('test-component');
    expect(element).toBeInTheDocument();
  });

  it('should stringify json values when passed to the dom', () => {
    const screen = render({ tagName: 'test-component' });
    const element = screen.getByTestId('test-component');
    expect(element.id).toEqual('test-component');
    expect(element.getAttribute('data-CustomAttributeWithJson')).toEqual(
      JSON.stringify(jsonAttributeValue),
    );
  });

  it('should render the component with passed props as attributes', () => {
    const screen = render({ tagName: 'test-component' });
    const element = screen.getByTestId('test-component');
    expect(element.id).toEqual('test-component');
    expect(element.getAttribute('text')).toEqual('Title');
  });

  it('should render nothing if the tag name is missing', () => {
    const screen = render({ tagName: undefined });
    const element = screen.queryByTestId('test-component');
    expect(element).not.toBeInTheDocument();
  });

  const render = (providedProps?: Partial<ICustomComponentProps>) => {
    const allProps: ICustomComponentProps = {
      ...mockComponentProps,
      id: 'test-component',
      tagName: '',
      formData: { simpleBinding: 'This is a test' },
      dataModelBindings: { simpleBinding: 'model' },
      text: 'Title',
      handleDataChange: (value: string) => value,
      getTextResource: (key: string) => {
        return key;
      },
      getTextResourceAsString: (key: string) => {
        return key;
      },
      isValid: true,
      language: {},
      shouldFocus: false,
      textResourceBindings: {
        title: 'title',
      },
      'data-CustomAttributeWithJson': jsonAttributeValue,
    };

    const resources = [
      {
        id: 'title',
        value: 'Title',
      },
    ] as ITextResource[];

    return renderWithProviders(
      <CustomWebComponent
        {...allProps}
        {...providedProps}
      />,
      {
        preloadedState: {
          textResources: {
            language: 'nb',
            resources,
            error: null,
          },
        },
      },
    );
  };
});
