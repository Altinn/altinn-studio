import * as React from 'react';
import type { ICustomComponentProps } from './CustomWebComponent';
import CustomWebComponent from './CustomWebComponent';
import { renderWithProviders } from '../../../testUtils';
import type { ITextResource } from 'altinn-shared/types';

describe('CustomWebComponent', () => {
  it('should render the component with the provided tag name', () => {
    const screen = render({ tagName: 'test-component' });
    const element = screen.getByTestId('test-component');
    expect(element).toBeInTheDocument();
  });

  it('should render the component with passed props as attributes', () => {
    const screen = render({ tagName: 'test-component' });
    const element = screen.getByTestId('test-component');
    expect(element.id).toEqual('test-component');
    expect(element.getAttribute('text')).toEqual(
      JSON.stringify({ title: 'Title' }),
    );
  });

  it('should render nothing if the tag name is missing', () => {
    const screen = render({ tagName: undefined });
    const element = screen.queryByTestId('test-component');
    expect(element).not.toBeInTheDocument();
  });

  const render = (providedProps?: Partial<ICustomComponentProps>) => {
    const allProps: ICustomComponentProps = {
      id: 'test-component',
      tagName: '',
      formData: { simpleBinding: 'This is a test' },
      dataModelBindings: { simpleBinding: 'model' },
      text: {
        title: 'Title',
      },
      handleDataChange: (value: string) => value,
      handleFocusUpdate: jest.fn(),
      getTextResource: (key: string) => {
        return key;
      },
      getTextResourceAsString: (key: string) => {
        return key;
      },
      isValid: true,
      language: {},
      shouldFocus: false,
      legend: null,
      label: null,
      type: 'Custom',
      textResourceBindings: {
        title: 'title',
      },
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
