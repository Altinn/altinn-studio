import React from 'react';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MapComponent } from './MapComponent';
import { renderWithMockStore, renderHookWithMockStore } from '../../../../testing/mocks';
import { appDataMock } from '../../../../testing/stateMocks';
import { useLayoutSchemaQuery } from '../../../../hooks/queries/useLayoutSchemaQuery';
import { mockUseTranslation } from '../../../../../../../testing/mocks/i18nMock';
import type { IGenericEditComponent } from '../../componentConfig';

const texts: Record<string, string> = {
  'validation_errors.required': 'Feltet er påkrevd!',
  'validation_errors.numbers_only': 'Kun tall er gyldig verdi!',
  'validation_errors.value_as_url': 'Ugyldig lenke!',
  'ux_editor.center_location': 'Sentrum av kartet',
  'ux_editor.map_layer': 'Kartlag',
  'ux_editor.latitude_label': 'Latitude',
  'ux_editor.longitude_label': 'Longitude',
  'ux_editor.url_label': 'Lenke *',
  'ux_editor.adjust_zoom': 'Standard zoom',
  'ux_editor.add_map_layer': 'Legg til kartlag',
  'ux_editor.attribution_label': 'Opphav',
  'ux_editor.subdomains_label': 'Subdomener (kommaseparert)',
};

jest.mock('react-i18next', () => ({ useTranslation: () => mockUseTranslation(texts) }));
const handleComponentChangeMock = jest.fn();

const waitForData = async () => {
  const layoutSchemaResult = renderHookWithMockStore()(() => useLayoutSchemaQuery())
    .renderHookResult.result;
  await waitFor(() => expect(layoutSchemaResult.current[0].isSuccess).toBe(true));
};

const renderMapComponent = async ({
  component = {} as any,
  handleComponentChange = handleComponentChangeMock,
}: Partial<IGenericEditComponent>) => {
  await waitForData();

  renderWithMockStore({
    appData: { ...appDataMock },
  })(<MapComponent component={component} handleComponentChange={handleComponentChange} />);
};

describe('MapComponent', () => {
  afterEach(() => jest.resetAllMocks());

  test('should render titles', async () => {
    await renderMapComponent({});
    expect(screen.getByRole('heading', { level: 2, name: 'Sentrum av kartet' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Legg til kartlag' }));
  });

  test('should render input-fields, latitude, longitude, zoom and button "Add map layer"', async () => {
    await renderMapComponent({});
    expect(screen.getByLabelText('Latitude')).toBeInTheDocument();
    expect(screen.getByLabelText('Longitude')).toBeInTheDocument();
    expect(screen.getByLabelText('Standard zoom')).toBeInTheDocument();
  });

  test('should be able to set latitude', async () => {
    const user = userEvent.setup();
    await renderMapComponent({
      handleComponentChange: handleComponentChangeMock,
    });

    const latitudeInput = screen.getByLabelText('Latitude');
    await act(() => user.type(latitudeInput, '40'));

    expect(handleComponentChangeMock).toHaveBeenLastCalledWith({
      centerLocation: { latitude: 40 },
    });
  });

  test('should be able to set longitude', async () => {
    const user = userEvent.setup();
    await renderMapComponent({
      handleComponentChange: handleComponentChangeMock,
    });

    const longitudeInput = screen.getByLabelText('Longitude');
    await act(() => user.type(longitudeInput, '21'));

    expect(handleComponentChangeMock).toHaveBeenLastCalledWith({
      centerLocation: { longitude: 21 },
    });
  });

  test('should be able to set zoom', async () => {
    const user = userEvent.setup();
    await renderMapComponent({
      handleComponentChange: handleComponentChangeMock,
    });

    const zoomInput = screen.getByLabelText('Standard zoom');
    await act(() => user.type(zoomInput, '2'));

    expect(handleComponentChangeMock).toHaveBeenLastCalledWith({ zoom: 2 });
  });
});

describe('AddMapLayer', () => {
  let componentMock;

  afterEach(() => {
    componentMock = {
      layers: [
        {
          attribution: undefined,
          subdomains: undefined,
          url: undefined,
        },
      ],
    };
  });

  it('renders correctly when layers are empty', async () => {
    await renderMapComponent({});

    const button = screen.getByRole('button');

    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it('renders correctly when layers are not empty', async () => {
    await renderMapComponent({ component: componentMock });

    expect(screen.getByLabelText(texts['ux_editor.url_label'])).toBeInTheDocument();
    expect(screen.getByLabelText(texts['ux_editor.attribution_label'])).toBeInTheDocument();
    expect(screen.getByLabelText(texts['ux_editor.subdomains_label'])).toBeInTheDocument();
  });

  test('should be able to set link', async () => {
    const user = userEvent.setup();
    await renderMapComponent({ component: componentMock });

    const input = screen.getByLabelText(texts['ux_editor.url_label']);
    await act(() => user.type(input, 'test'));

    expect(handleComponentChangeMock).toHaveBeenLastCalledWith({
      layers: [
        {
          attribution: undefined,
          subdomains: undefined,
          url: 'test',
        },
      ],
    });
  });

  test('should be able to set attribution', async () => {
    const user = userEvent.setup();
    await renderMapComponent({ component: componentMock });

    const input = screen.getByLabelText(texts['ux_editor.attribution_label']);
    await act(() => user.type(input, 'test'));

    expect(handleComponentChangeMock).toHaveBeenLastCalledWith({
      layers: [
        {
          attribution: 'test',
          subdomains: undefined,
          url: undefined,
        },
      ],
    });
  });

  test('should be able to set subdomains', async () => {
    const user = userEvent.setup();
    await renderMapComponent({ component: componentMock });

    const input = screen.getByLabelText(texts['ux_editor.subdomains_label']);
    await act(() => user.type(input, 'test'));

    expect(handleComponentChangeMock).toHaveBeenLastCalledWith({
      layers: [
        {
          attribution: undefined,
          subdomains: ['test'],
          url: undefined,
        },
      ],
    });
  });

  it('calls handleAddLayer on button click', async () => {
    const user = userEvent.setup();
    await renderMapComponent({});

    const button = screen.getByRole('button');

    await act(() => user.click(button));

    expect(handleComponentChangeMock).toHaveBeenLastCalledWith({
      layers: [
        {
          attribution: undefined,
          subdomains: undefined,
          url: undefined,
        },
      ],
    });
  });
});
