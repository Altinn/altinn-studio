/* eslint-disable @typescript-eslint/no-empty-function */
import * as React from 'react';
import type { ICustomComponentProps } from './CustomWebComponent';
import CustomWebComponent from './CustomWebComponent';
import { renderWithProviders } from '../../../testUtils';
import type { ITextResource } from 'altinn-shared/types';

describe('components > custom > CustomWebComponent', () => {
  let handleDataChange: ICustomComponentProps['handleDataChange'];
  let mockTextResources: ITextResource[];

  beforeAll(() => {
    handleDataChange = (value: string) => value;
    mockTextResources = [
      {
        id: 'title',
        value: 'Title',
      },
    ];
  });

  it('should render the component with the provided tag name', async () => {
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

  it('should render nothing if the tag name is missing', async () => {
    const screen = render({ tagName: undefined });
    const element = await screen.queryByTestId('test-component');
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
      handleDataChange,
      handleFocusUpdate: () => {},
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

    return renderWithProviders(
      <CustomWebComponent
        {...allProps}
        {...providedProps}
      />,
      {
        preloadedState: {
          textResources: {
            language: 'nb',
            resources: mockTextResources,
            error: null,
          },
        },
      },
    );
  };
});
