import React from 'react';

import { jest } from '@jest/globals';
import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import axios from 'axios';

import { getPartyMock } from 'src/__mocks__/getPartyMock';
import { PresentationComponent } from 'src/components/presentation/Presentation';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import { AltinnAppTheme } from 'src/theme/altinnAppTheme';
import { ProcessTaskType } from 'src/types';
import { HttpStatusCodes } from 'src/utils/network/networking';
import { returnUrlToMessagebox } from 'src/utils/urls/urlHelper';
import type { IPresentationProvidedProps } from 'src/components/presentation/Presentation';

describe('Presentation', () => {
  const user = userEvent.setup();
  jest.mock('axios');
  const mockedAxios = axios as jest.Mocked<typeof axios>;
  let assignMock = jest.fn();
  let realLocation: Location = window.location;

  beforeEach(() => {
    assignMock = jest.fn();
    realLocation = window.location;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should change window.location.href to query parameter returnUrl if valid URL', async () => {
    const returnUrl = 'foo';

    const mockedLocation = { ...realLocation, search: `?returnUrl=${returnUrl}`, assign: assignMock };
    jest.spyOn(window, 'location', 'get').mockReturnValue(mockedLocation);

    mockedAxios.get.mockResolvedValueOnce({
      data: returnUrl,
      status: HttpStatusCodes.Ok,
    });

    await render({ type: ProcessTaskType.Data });

    expect(window.location.href).not.toEqual(returnUrl);

    const closeButton = screen.getByRole('button', {
      name: /Lukk skjema/i,
    });
    await user.click(closeButton);

    expect(assignMock).toHaveBeenCalledWith(returnUrl);
  });

  it('should change window.location.href to default messagebox url if query parameter returnUrl is not valid', async () => {
    const origin = 'https://local.altinn.cloud';
    const returnUrl = 'https://altinn.cloud.no';
    const mockedLocation = { ...realLocation, search: `?returnUrl=${returnUrl}`, assign: assignMock, origin };
    jest.spyOn(window, 'location', 'get').mockReturnValue(mockedLocation);
    const messageBoxUrl = returnUrlToMessagebox(origin, getPartyMock().partyId);

    mockedAxios.get.mockRejectedValueOnce({
      data: 'Error',
      status: HttpStatusCodes.BadRequest,
    });

    // TODO: Replicate stateWithErrorsAndWarnings?
    await render({ type: ProcessTaskType.Data });

    expect(window.location.href).not.toEqual(messageBoxUrl);

    const closeButton = screen.getByRole('button', {
      name: /lukk skjema/i,
    });

    await user.click(closeButton);

    expect(assignMock).toHaveBeenCalledWith(messageBoxUrl);
  });

  it('should change window.location.href to default messagebox url if query parameter returnUrl is not found', async () => {
    const origin = 'https://local.altinn.cloud';
    const partyId = getPartyMock().partyId;
    const messageBoxUrl = returnUrlToMessagebox(origin, partyId);
    const mockedLocation = { ...realLocation, assign: assignMock, origin, search: '' };

    jest.spyOn(window, 'location', 'get').mockReturnValue(mockedLocation);

    // TODO: Replicate stateWithErrorsAndWarnings?
    await render({ type: ProcessTaskType.Data });

    expect(window.location.href).not.toEqual(messageBoxUrl);

    const closeButton = screen.getByRole('button', {
      name: /lukk skjema/i,
    });
    await user.click(closeButton);

    expect(assignMock).toHaveBeenCalledWith(messageBoxUrl);
  });

  it('should render children', async () => {
    await render({
      type: ProcessTaskType.Data,
      children: <div data-testid='child-component' />,
    });

    expect(screen.getByTestId('child-component')).toBeInTheDocument();
  });

  it('the background color should be greyLight if type is "ProcessTaskType.Data"', async () => {
    await render({ type: ProcessTaskType.Data });

    const appHeader = screen.getByTestId('AltinnAppHeader');

    expect(appHeader).toHaveStyle(`background-color: ${AltinnAppTheme.altinnPalette.primary.greyLight}`);
  });

  it('the background color should be lightGreen if type is "ProcessTaskType.Archived"', async () => {
    await render({ type: ProcessTaskType.Archived });

    const appHeader = screen.getByTestId('AltinnAppHeader');

    expect(appHeader).toHaveStyle(`background-color: ${AltinnAppTheme.altinnPalette.primary.greenLight}`);
  });
});

const render = async (props: Partial<IPresentationProvidedProps> = {}) => {
  const allProps = {
    header: 'Header text',
    type: ProcessTaskType.Unknown,
    ...props,
  };

  await renderWithInstanceAndLayout({
    renderer: () => <PresentationComponent {...allProps} />,
    taskId: 'Task_1',
  });
};
