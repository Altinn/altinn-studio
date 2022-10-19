import React from 'react';

import { render as rtlRender, screen } from '@testing-library/react';

import { MapComponent } from 'src/components/base/MapComponent';
import type { IMapComponentProps } from 'src/components/base/MapComponent';

const render = (props: Partial<IMapComponentProps> = {}) => {
  const mockLanguage = {
    map_component: {
      selectedLocation: 'Selected location: {0},{1}',
      noSelectedLocation: 'No selected location',
    },
  };

  const allProps: IMapComponentProps = {
    id: 'id',
    formData: {
      simpleBinding: undefined,
    },
    handleDataChange: () => '',
    getTextResource: (key: string) => key,
    isValid: true,
    dataModelBindings: {},
    componentValidations: {},
    language: mockLanguage,
    readOnly: false,
    required: false,
    textResourceBindings: {},
    ...({} as IMapComponentProps),
    ...props,
  };

  return rtlRender(<MapComponent {...allProps} />);
};

describe('MapComponent', () => {
  it('should show correct footer text when no location is selected', () => {
    render();

    expect(screen.queryByText('No selected location')).toBeInTheDocument();
    expect(screen.queryByText('Selected location')).not.toBeInTheDocument();
  });

  it('should show correct footer text when location is set', () => {
    render({
      formData: {
        simpleBinding: '59.2641592,10.4036248',
      },
    });

    expect(screen.queryByText('No selected location')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Selected location: 59.2641592,10.4036248'),
    ).toBeInTheDocument();
  });

  it('should mark map component with validation error when validation fails', () => {
    const { container } = render({
      isValid: false,
    });

    const mapComponent = container.getElementsByClassName('map-component')[0];
    expect(mapComponent).toHaveClass('validation-error');
  });

  it('should not mark map component with validation error when validation succeeds', () => {
    const { container } = render({
      isValid: true,
    });

    const mapComponent = container.getElementsByClassName('map-component')[0];
    expect(mapComponent).not.toHaveClass('validation-error');
  });
});
