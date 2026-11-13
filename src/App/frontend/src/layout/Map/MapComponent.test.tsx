import React from 'react';

import { act, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { defaultDataTypeMock } from 'src/__mocks__/getUiConfigMock';
import { ALTINN_ROW_ID } from 'src/features/formData/types';
import { MapComponent } from 'src/layout/Map/MapComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { FDLeafValue } from 'src/features/formData/FormDataWrite';
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
  it('renders drawing tools inside the map context', async () => {
    const { container } = await render({ component: { toolbar: { polygon: true, polyline: true } } });

    expect(container.querySelector('.leaflet-draw-draw-polygon')).toBeInTheDocument();
    expect(container.querySelector('.leaflet-draw-draw-polyline')).toBeInTheDocument();
    expect(container.querySelector('.leaflet-draw-draw-marker')).not.toBeInTheDocument();
  });

  it('keeps the drawn layers when saved data changes fields that are not drawn', async () => {
    const geometries = { dataType: defaultDataTypeMock, field: 'Geometries' };
    const polygon = (lng: number) =>
      JSON.stringify({
        type: 'Polygon',
        coordinates: [
          [
            [lng, 59],
            [lng + 1, 59],
            [lng + 1, 60],
            [lng, 59],
          ],
        ],
      });
    const { container, formDataMethods } = await render({
      component: {
        toolbar: { polygon: true },
        geometryType: 'GeoJSON',
        dataModelBindings: {
          geometries,
          geometryData: { dataType: defaultDataTypeMock, field: 'Geometries.Data' },
          geometryLabel: { dataType: defaultDataTypeMock, field: 'Geometries.Label' },
          geometryIsEditable: { dataType: defaultDataTypeMock, field: 'Geometries.Editable' },
        },
      },
      queries: {
        fetchFormBootstrapForInstance: async () =>
          getFormBootstrapMock((obj) => {
            obj.dataModels[defaultDataTypeMock].initialData = {
              Geometries: [{ [ALTINN_ROW_ID]: 'row-1', Data: polygon(10), Editable: true }],
            };
          }),
      },
    });
    const setField = (field: string, newValue: FDLeafValue) =>
      act(() => {
        formDataMethods.setLeafValueInList({
          reference: geometries,
          findRow: (row) => row[ALTINN_ROW_ID] === 'row-1',
          field,
          newValue,
        });
        formDataMethods.debounce('forced');
      });

    const drawnLayer = container.querySelector('path.leaflet-interactive');
    expect(drawnLayer).toBeInTheDocument();

    // Editable geometries are drawn without their label
    setField('Label', 'Field 1');
    expect(container.querySelector('path.leaflet-interactive')).toBe(drawnLayer);

    setField('Data', polygon(12));
    await waitFor(() => expect(container.querySelector('path.leaflet-interactive')).not.toBe(drawnLayer));
  });

  it('should show correct footer text when no location is selected', async () => {
    await render();

    expect(screen.getByText('Ingen lokasjon valgt')).toBeInTheDocument();
    expect(screen.queryByText('Valgt lokasjon')).not.toBeInTheDocument();
  });

  it('should show correct footer text when location is set', async () => {
    await render({
      queries: {
        fetchFormBootstrapForInstance: async () =>
          getFormBootstrapMock((obj) => {
            obj.dataModels[defaultDataTypeMock].initialData = {
              myCoords: '59.2641592,10.4036248',
            };
          }),
      },
    });

    expect(screen.queryByText('Ingen lokasjon valgt')).not.toBeInTheDocument();
    expect(screen.getByText('Valgt lokasjon: 59.2641592° nord, 10.4036248° øst')).toBeInTheDocument();
  });

  it('should show marker when marker is set', async () => {
    await render({
      queries: {
        fetchFormBootstrapForInstance: async () =>
          getFormBootstrapMock((obj) => {
            obj.dataModels[defaultDataTypeMock].initialData = {
              myCoords: '59.2641592,10.4036248',
            };
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

  it('should show map with localized zoom buttons when readonly is false', async () => {
    await render();

    expect(screen.queryByRole('button', { name: 'Zoom inn' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Zoom ut' })).toBeInTheDocument();
  });

  it('should show map without zoom buttons when readonly is true', async () => {
    await render({ component: { readOnly: true } });

    expect(screen.queryByRole('button', { name: 'Zoom inn' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Zoom ut' })).not.toBeInTheDocument();
  });

  it('should expose the map as a group with a localized accessible name', async () => {
    await render();

    expect(
      screen.getByRole('group', {
        name: 'Interaktivt kart. Bruk piltaster for å panorere, pluss og minus for å zoome.',
      }),
    ).toBeInTheDocument();
  });

  it('should announce the component label first in the map group name', async () => {
    await render({
      component: {
        textResourceBindings: { title: 'Min Kartkomponent' },
      },
    });

    expect(
      screen.getByRole('group', {
        name: 'Min Kartkomponent. Interaktivt kart. Bruk piltaster for å panorere, pluss og minus for å zoome.',
      }),
    ).toBeInTheDocument();
  });

  it('should announce the selection state via a polite live region', async () => {
    await render();

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Ingen lokasjon valgt');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('should render map tiles as decorative (empty alt)', async () => {
    const { container } = await render();

    const tiles = container.querySelectorAll<HTMLImageElement>('img.leaflet-tile');
    expect(tiles.length).toBeGreaterThan(0);
    tiles.forEach((tile) => {
      expect(tile.getAttribute('alt')).toBe('');
      expect(tile.referrerPolicy).toBe('strict-origin-when-cross-origin');
    });
  });

  it('should have expression support for latitude and longitude in centerLocation', async () => {
    const { formDataMethods, container } = await render({
      component: {
        centerLocation: {
          latitude: ['if', true, 59.9121],
          longitude: ['if', true, 10.73333],
        },
      },
    });

    await clickMap(container);

    expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({
      reference: { dataType: defaultDataTypeMock, field: 'myCoords' },
      newValue: '59.933000,10.722656',
    } satisfies FDNewValue);
  });
});
