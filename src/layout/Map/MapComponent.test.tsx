import React from 'react';

import { screen } from '@testing-library/react';

import { MapComponent } from 'src/layout/Map/MapComponent';
import { renderGenericComponentTest } from 'src/testUtils';
import type { RenderGenericComponentTestProps } from 'src/testUtils';

const render = ({ component, genericProps }: Partial<RenderGenericComponentTestProps<'Map'>> = {}) =>
  renderGenericComponentTest({
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
      ...genericProps,
    },
  });

describe('MapComponent', () => {
  it('should show correct footer text when no location is selected', () => {
    render();

    expect(screen.getByText('Ingen lokasjon valgt')).toBeInTheDocument();
    expect(screen.queryByText('Valgt lokasjon')).not.toBeInTheDocument();
  });

  it('should show correct footer text when location is set', () => {
    render({
      genericProps: {
        formData: {
          simpleBinding: '59.2641592,10.4036248',
        },
      },
    });

    expect(screen.queryByText('Ingen lokasjon valgt')).not.toBeInTheDocument();
    expect(screen.getByText('Valgt lokasjon: 59.2641592° nord, 10.4036248° øst')).toBeInTheDocument();
  });

  it('should mark map component with validation error when validation fails', () => {
    const { container } = render({
      genericProps: {
        isValid: false,
      },
    });

    // eslint-disable-next-line
    const mapComponent = container.getElementsByClassName('map-component')[0];
    expect(mapComponent).toHaveClass('validation-error');
  });

  it('should not mark map component with validation error when validation succeeds', () => {
    const { container } = render({
      genericProps: {
        isValid: true,
      },
    });

    // eslint-disable-next-line
    const mapComponent = container.getElementsByClassName('map-component')[0];
    expect(mapComponent).not.toHaveClass('validation-error');
  });
});
