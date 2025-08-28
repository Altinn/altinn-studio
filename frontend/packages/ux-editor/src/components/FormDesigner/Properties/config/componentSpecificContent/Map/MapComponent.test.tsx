import React from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MapComponent } from './MapComponent';
import { renderWithProviders, renderHookWithProviders } from '../../../../../../testing/mocks';
import { useLayoutSchemaQuery } from '../../../../../../hooks/queries/useLayoutSchemaQuery';
import type { IGenericEditComponent } from '../../componentConfig';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { textMock } from '@studio/testing/mocks/i18nMock';

const handleComponentChangeMock = jest.fn();

const waitForData = async () => {
  const layoutSchemaResult = renderHookWithProviders(() => useLayoutSchemaQuery()).result;
  await waitFor(() => expect(layoutSchemaResult.current[0].isSuccess).toBe(true));
};

const renderMapComponent = async ({
  component = {} as any,
  handleComponentChange = handleComponentChangeMock,
}: Partial<IGenericEditComponent<ComponentType.Map>>) => {
  await waitForData();

  renderWithProviders(
    <MapComponent component={component} handleComponentChange={handleComponentChange} />,
  );
};

describe('MapComponent', () => {
  afterEach(() => jest.resetAllMocks());

  it('should render /Legg til kartlag/ button', async () => {
    await renderMapComponent({});
    expect(
      screen.getByRole('button', { name: textMock('ux_editor.add_map_layer') }),
    ).toBeInTheDocument();
  });
});

describe('AddMapLayer', () => {
  let componentMock;

  afterEach(() => {
    jest.clearAllMocks();
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

  it('should set layers to undefined when deleting last layer', async () => {
    const user = userEvent.setup();
    await renderMapComponent({ component: componentMock });
    const button = within(screen.getByRole('menubar')).getByRole('button');
    await user.click(button);
    expect(handleComponentChangeMock).toHaveBeenCalledTimes(1);
    expect(handleComponentChangeMock).toHaveBeenLastCalledWith({});
  });

  it('should call handleComponentChange with deleted layer with multiple layers', async () => {
    const multipleLayersComponent: any = {
      layers: [
        {
          attribution: undefined,
          subdomains: undefined,
          url: undefined,
        },
        {
          attribution: undefined,
          subdomains: undefined,
          url: undefined,
        },
      ],
    };
    const user = userEvent.setup();
    await renderMapComponent({ component: multipleLayersComponent });
    const button = within(screen.getAllByRole('menubar')[0]).getByRole('button');
    await user.click(button);
    expect(handleComponentChangeMock).toHaveBeenCalledTimes(1);
    const expectedComponent = {
      ...multipleLayersComponent,
    };
    expectedComponent.layers.splice(0, 1);
    expect(handleComponentChangeMock).toHaveBeenLastCalledWith(expectedComponent);
  });
});
