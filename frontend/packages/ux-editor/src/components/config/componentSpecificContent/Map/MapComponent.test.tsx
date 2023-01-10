import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MapComponent, MapComponentProps } from './MapComponent';
import { renderWithMockStore, languageStateMock, appDataMock } from '../../../../testing/mocks';

const language: Record<string, string> = {
  'validation_errors.required': 'Feltet er påkrevd!',
  'validation_errors.numbers_only': 'Kun tall er gyldig verdi!',
  'validation_errors.value_as_url': 'Ugyldig lenke!',
  'ux_editor.center_location': 'Sentrum av kartet',
  'ux_editor.map_layer': 'Kartlag',
  'ux_editor.latitude_label': 'Latitude',
  'ux_editor.longitude_label': 'Longitude',
  'ux_editor.url_label': 'Lenke',
  'ux_editor.adjust_zoom': 'Standard zoom',
  'ux_editor.add_map_layer': 'Legg til kartlag'
};

const renderMapComponent = ({
  component = {} as any,
  handleComponentChange = () => {}
}: Partial<MapComponentProps>) => {
  const user = userEvent.setup();
  renderWithMockStore({
    appData: {
      ...appDataMock,
      languageState: {
        ...languageStateMock,
        language
      }
    }
  })(<MapComponent component={component} handleComponentChange={handleComponentChange} />);
  return { user };
};

test('should render titles', () => {
  renderMapComponent({});
  expect(screen.getByRole('heading', { level: 2, name: 'Sentrum av kartet' }));
  expect(screen.getByRole('heading', { level: 2, name: 'Legg til kartlag' }));
});

test('should render input-fields, latitude, longitude, zoom and button "Add map layer"', () => {
  renderMapComponent({});
  expect(screen.getByLabelText('Latitude *')).toBeInTheDocument();
  expect(screen.getByLabelText('Longitude *')).toBeInTheDocument();
  expect(screen.getByLabelText('Standard zoom')).toBeInTheDocument();
});

test('should be able to set latitude', async () => {
  const handleComponentChangeMock = jest.fn();
  const { user } = renderMapComponent({
    handleComponentChange: handleComponentChangeMock
  });

  const latitudeInput = screen.getByLabelText('Latitude *');
  await user.type(latitudeInput, '40');

  expect(handleComponentChangeMock).toHaveBeenLastCalledWith({
    centerLocation: { latitude: '40' }
  });
});

test('should be able to set longitude', async () => {
  const handleComponentChangeMock = jest.fn();
  const { user } = renderMapComponent({
    handleComponentChange: handleComponentChangeMock
  });

  const longitudeInput = screen.getByLabelText('Longitude *');
  await user.type(longitudeInput, '21');

  expect(handleComponentChangeMock).toHaveBeenLastCalledWith({
    centerLocation: { longitude: '21' }
  });
});

test('should be able to set zoom', async () => {
  const handleComponentChangeMock = jest.fn();
  const { user } = renderMapComponent({
    handleComponentChange: handleComponentChangeMock
  });

  const zoomInput = screen.getByLabelText('Standard zoom');
  await user.type(zoomInput, '2');

  expect(handleComponentChangeMock).toHaveBeenLastCalledWith({ zoom: 2 });
});

test('latitude should be invalid when input is not a number', async () => {
  const { user } = renderMapComponent({});

  await user.type(screen.getByLabelText('Latitude *'), 'A');
  expect(screen.getByText('Kun tall er gyldig verdi!')).toBeInTheDocument();
});

test('longitude should be invalid when input is not a number', async () => {
  const { user } = renderMapComponent({});

  await user.type(screen.getByLabelText('Longitude *'), 'B');
  expect(screen.getByText('Kun tall er gyldig verdi!')).toBeInTheDocument();
});

test('zoom should be invalid when input is not a number', async () => {
  const { user } = renderMapComponent({});

  await user.type(screen.getByLabelText('Standard zoom'), 'C');
  expect(screen.getByText('Kun tall er gyldig verdi!')).toBeInTheDocument();
});
