import React from 'react';

import { screen } from '@testing-library/react';

import { MapComponent } from 'src/layout/Map/MapComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { RenderGenericComponentTestProps } from 'src/test/renderWithProviders';

const render = async ({ component, ...rest }: Partial<RenderGenericComponentTestProps<'Map'>> = {}) =>
  await renderGenericComponentTest({
    type: 'Map',
    renderer: (props) => <MapComponent {...props} />,
    component: {
      readOnly: false,
      required: false,
      textResourceBindings: {},
      dataModelBindings: {
        simpleBinding: 'myCoords',
      },
      ...component,
    },
    genericProps: {
      isValid: true,
      ...rest.genericProps,
    },
    ...rest,
  });

describe('MapComponent', () => {
  it('should show correct footer text when no location is selected', async () => {
    await render();

    expect(screen.getByText('Ingen lokasjon valgt')).toBeInTheDocument();
    expect(screen.queryByText('Valgt lokasjon')).not.toBeInTheDocument();
  });

  it('should show correct footer text when location is set', async () => {
    await render({
      queries: {
        fetchFormData: async () => ({
          myCoords: '59.2641592,10.4036248',
        }),
      },
    });

    expect(screen.queryByText('Ingen lokasjon valgt')).not.toBeInTheDocument();
    expect(screen.getByText('Valgt lokasjon: 59.2641592° nord, 10.4036248° øst')).toBeInTheDocument();
  });

  it('should mark map component with validation error when validation fails', async () => {
    const { container } = await render({
      genericProps: {
        isValid: false,
      },
    });

    // eslint-disable-next-line
    const mapComponent = container.getElementsByClassName('map-component')[0];
    expect(mapComponent).toHaveClass('validation-error');
  });

  it('should not mark map component with validation error when validation succeeds', async () => {
    const { container } = await render({
      genericProps: {
        isValid: true,
      },
    });

    // eslint-disable-next-line
    const mapComponent = container.getElementsByClassName('map-component')[0];
    expect(mapComponent).not.toHaveClass('validation-error');
  });
});
