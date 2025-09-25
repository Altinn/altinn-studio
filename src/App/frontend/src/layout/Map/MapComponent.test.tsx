import React from 'react';

import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { defaultDataTypeMock } from 'src/__mocks__/getLayoutSetsMock';
import { MapComponent } from 'src/layout/Map/MapComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { FDNewValue } from 'src/features/formData/FormDataWriteStateMachine';
import type { RenderGenericComponentTestProps } from 'src/test/renderWithProviders';

const user = userEvent.setup();

const render = async ({ component, ...rest }: Partial<RenderGenericComponentTestProps<'Map'>> = {}) =>
  await renderGenericComponentTest({
    type: 'Map',
    renderer: (props) => <MapComponent {...props} />,
    component: {
      readOnly: false,
      required: false,
      textResourceBindings: {},
      dataModelBindings: {
        simpleBinding: { dataType: defaultDataTypeMock, field: 'myCoords' },
      },
      ...component,
    },
    ...rest,
  });

async function clickMap(container: HTMLElement, clientX = 0, clientY = 0) {
  const firstMapLayer = container.getElementsByTagName('img')[0];
  await user.pointer([
    {
      pointerName: 'mouse',
      target: firstMapLayer,
      coords: {
        clientX,
        clientY,
      },
      keys: '[MouseLeft]',
    },
  ]);
}

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

  it('should show marker when marker is set', async () => {
    await render({
      queries: {
        fetchFormData: async () => ({
          myCoords: '59.2641592,10.4036248',
        }),
      },
    });
    expect(screen.queryByRole('button', { name: 'Marker' })).toBeInTheDocument();
  });

  it('should not show marker when marker is not set', async () => {
    await render();
    expect(screen.queryByRole('button', { name: 'Marker' })).not.toBeInTheDocument();
  });

  it('should call onClick with correct coordinates when map is clicked', async () => {
    const { formDataMethods, container } = await render();

    await clickMap(container);

    expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({
      reference: { dataType: defaultDataTypeMock, field: 'myCoords' },
      newValue: '64.886265,12.832031',
    } satisfies FDNewValue);
  });

  it('should call onClick with longitude between 180 and -180 even when map is wrapped', async () => {
    const { formDataMethods, container } = await render();

    await clickMap(container, 2500, 0); // Click so that the world is wrapped

    expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({
      reference: { dataType: defaultDataTypeMock, field: 'myCoords' },
      newValue: '64.886265,-127.441406',
    } satisfies FDNewValue);
  });

  it('should not call onClick when readOnly is true and map is clicked', async () => {
    const { formDataMethods, container } = await render({ component: { readOnly: true } });

    await clickMap(container);
    expect(formDataMethods.setLeafValue).not.toHaveBeenCalledWith();
  });

  it('should display attribution link', async () => {
    await render({
      component: {
        layers: [
          {
            url: 'dummy',
            attribution: '<a href="https://dummylink.invalid">Dummy link</a>',
          },
        ],
      },
    });

    expect(screen.queryByRole('link', { name: 'Dummy link' })).toBeInTheDocument();
  });

  it('should show map with zoom buttons when readonly is false', async () => {
    await render();

    expect(screen.queryByRole('button', { name: 'Zoom in' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Zoom out' })).toBeInTheDocument();
  });

  it('should show map without zoom buttons when readonly is true', async () => {
    await render({ component: { readOnly: true } });

    expect(screen.queryByRole('button', { name: 'Zoom in' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Zoom out' })).not.toBeInTheDocument();
  });
});
