import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MapComponent } from './MapComponent';
import { renderWithMockStore, renderHookWithMockStore } from '../../../../testing/mocks';
import { appDataMock } from '../../../../testing/stateMocks';
import { useLayoutSchemaQuery } from '../../../../hooks/queries/useLayoutSchemaQuery';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { IGenericEditComponent } from '../../componentConfig';

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
    expect(screen.getByRole('heading', { level: 2, name: textMock('ux_editor.center_location') }));
    expect(screen.getByRole('heading', { level: 2, name: textMock('ux_editor.add_map_layer') }));
  });

  test('should render input-fields, latitude, longitude, zoom and button "Add map layer"', async () => {
    await renderMapComponent({});
    expect(screen.getByLabelText(textMock('ux_editor.latitude_label'))).toBeInTheDocument();
    expect(screen.getByLabelText(textMock('ux_editor.longitude_label'))).toBeInTheDocument();
    expect(screen.getByLabelText(textMock('ux_editor.adjust_zoom'))).toBeInTheDocument();
  });

  test('should be able to set latitude', async () => {
    const user = userEvent.setup();
    await renderMapComponent({
      handleComponentChange: handleComponentChangeMock,
    });

    const latitudeInput = screen.getByLabelText(textMock('ux_editor.latitude_label'));
    await user.type(latitudeInput, '40');

    expect(handleComponentChangeMock).toHaveBeenLastCalledWith({
      centerLocation: { latitude: 40 },
    });
  });

  test('should be able to set longitude', async () => {
    const user = userEvent.setup();
    await renderMapComponent({
      handleComponentChange: handleComponentChangeMock,
    });

    const longitudeInput = screen.getByLabelText(textMock('ux_editor.longitude_label'));
    await user.type(longitudeInput, '21');

    expect(handleComponentChangeMock).toHaveBeenLastCalledWith({
      centerLocation: { longitude: 21 },
    });
  });

  test('should be able to set zoom', async () => {
    const user = userEvent.setup();
    await renderMapComponent({
      handleComponentChange: handleComponentChangeMock,
    });

    const zoomInput = screen.getByLabelText(textMock('ux_editor.adjust_zoom'));
    await user.type(zoomInput, '2');

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

    expect(screen.getByLabelText(textMock('ux_editor.url_label'))).toBeInTheDocument();
    expect(screen.getByLabelText(textMock('ux_editor.attribution_label'))).toBeInTheDocument();
    expect(screen.getByLabelText(textMock('ux_editor.subdomains_label'))).toBeInTheDocument();
  });

  test('should be able to set link', async () => {
    const user = userEvent.setup();
    await renderMapComponent({ component: componentMock });

    const input = screen.getByLabelText(textMock('ux_editor.url_label'));
    await user.type(input, 'test');

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

    const input = screen.getByLabelText(textMock('ux_editor.attribution_label'));
    await user.type(input, 'test');

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

    const input = screen.getByLabelText(textMock('ux_editor.subdomains_label'));
    await user.type(input, 'test');

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

    await user.click(button);

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
