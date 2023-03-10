import React from 'react';

import { screen } from '@testing-library/react';

import { MapComponent } from 'src/layout/Map/MapComponent';
import { renderGenericComponentTest } from 'src/testUtils';
import type { RenderGenericComponentTestProps } from 'src/testUtils';

const render = ({ component, genericProps }: Partial<RenderGenericComponentTestProps<'Map'>> = {}) => {
  return renderGenericComponentTest({
    type: 'Map',
    renderer: (props) => <MapComponent {...props} />,
    component: {
      dataModelBindings: {},
      readOnly: false,
      required: false,
      textResourceBindings: {},
      ...component,
    },
    genericProps: {
      formData: {
        simpleBinding: undefined,
      },
      isValid: true,
      language: {
        map_component: {
          selectedLocation: 'Selected location: {0},{1}',
          noSelectedLocation: 'No selected location',
        },
      },
      ...genericProps,
    },
  });
};

describe('MapComponent', () => {
  it('should show correct footer text when no location is selected', () => {
    render();

    expect(screen.queryByText('No selected location')).toBeInTheDocument();
    expect(screen.queryByText('Selected location')).not.toBeInTheDocument();
  });

  it('should show correct footer text when location is set', () => {
    render({
      genericProps: {
        formData: {
          simpleBinding: '59.2641592,10.4036248',
        },
      },
    });

    expect(screen.queryByText('No selected location')).not.toBeInTheDocument();
    expect(screen.queryByText('Selected location: 59.2641592,10.4036248')).toBeInTheDocument();
  });

  it('should mark map component with validation error when validation fails', () => {
    const { container } = render({
      genericProps: {
        isValid: false,
      },
    });

    const mapComponent = container.getElementsByClassName('map-component')[0];
    expect(mapComponent).toHaveClass('validation-error');
  });

  it('should not mark map component with validation error when validation succeeds', () => {
    const { container } = render({
      genericProps: {
        isValid: true,
      },
    });

    const mapComponent = container.getElementsByClassName('map-component')[0];
    expect(mapComponent).not.toHaveClass('validation-error');
  });
});
