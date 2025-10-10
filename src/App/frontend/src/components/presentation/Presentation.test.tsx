import React from 'react';

import { jest } from '@jest/globals';
import { screen } from '@testing-library/react';

import { getPartyMock } from 'src/__mocks__/getPartyMock';
import { PresentationComponent } from 'src/components/presentation/Presentation';
import { useIsReceiptPage } from 'src/core/routing/useIsReceiptPage';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import { AltinnPalette } from 'src/theme/altinnAppTheme';
import { ProcessTaskType } from 'src/types';
import { getMessageBoxUrl } from 'src/utils/urls/urlHelper';
import type { IPresentationProvidedProps } from 'src/components/presentation/Presentation';
import type { AppQueries } from 'src/queries/types';

jest.mock('axios');

jest.mock('src/core/routing/useIsReceiptPage', () => ({
  useIsReceiptPage: jest.fn(),
}));

const mockUseIsReceiptPage = useIsReceiptPage as jest.MockedFunction<typeof useIsReceiptPage>;

describe('Presentation', () => {
  let realLocation: Location = window.location;

  beforeEach(() => {
    realLocation = window.location;
    mockUseIsReceiptPage.mockReturnValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should link to query parameter returnUrl if valid URL', async () => {
    const returnUrl = 'foo';

    const mockedLocation = { ...realLocation, search: `?returnUrl=${returnUrl}` };
    jest.spyOn(window, 'location', 'get').mockReturnValue(mockedLocation);

    await render({}, { fetchReturnUrl: async () => returnUrl });

    const closeButton = screen.getByRole('link', {
      name: 'Tilbake',
    });

    expect(closeButton).toHaveAttribute('href', returnUrl);
  });

  it('should link to default messagebox url if query parameter returnUrl is not valid', async () => {
    const host = 'ttd.apps.tt02.altinn.no';
    const returnUrl = 'https://altinn.cloud.no';
    const mockedLocation = { ...realLocation, search: `?returnUrl=${returnUrl}`, host };
    jest.spyOn(window, 'location', 'get').mockReturnValue(mockedLocation);
    const messageBoxUrl = getMessageBoxUrl(getPartyMock().partyId);

    await render();

    const closeButton = screen.getByRole('link', {
      name: 'Tilbake til innboks',
    });

    expect(closeButton).toHaveAttribute('href', messageBoxUrl);
  });

  it('should link to default messagebox url if query parameter returnUrl is not found', async () => {
    const host = 'ttd.apps.tt02.altinn.no';
    const partyId = getPartyMock().partyId;
    const mockedLocation = { ...realLocation, host, search: '' };
    jest.spyOn(window, 'location', 'get').mockReturnValue(mockedLocation);
    const messageBoxUrl = getMessageBoxUrl(partyId);

    await render();

    const closeButton = screen.getByRole('link', {
      name: 'Tilbake til innboks',
    });

    expect(closeButton).toHaveAttribute('href', messageBoxUrl);
  });

  it('should render children', async () => {
    await render({
      children: <div data-testid='child-component' />,
    });

    expect(screen.getByTestId('child-component')).toBeInTheDocument();
  });

  it('the background color should be greyLight if type is "ProcessTaskType.Data"', async () => {
    await render();

    const appHeader = screen.getByTestId('AppHeader');

    expect(appHeader).toHaveStyle(`background-color: ${AltinnPalette.greyLight}`);
  });

  it('the background color should be lightGreen if type is "ProcessTaskType.Archived"', async () => {
    mockUseIsReceiptPage.mockReturnValue(true);

    await render();

    const appHeader = screen.getByTestId('AppHeader');

    expect(appHeader).toHaveStyle(`background-color: ${AltinnPalette.greenLight}`);
  });
});

const render = async (props: Partial<IPresentationProvidedProps> = {}, queries: Partial<AppQueries> = {}) => {
  const allProps = {
    header: 'Header text',
    type: ProcessTaskType.Unknown,
    ...props,
  };

  await renderWithInstanceAndLayout({
    renderer: () => <PresentationComponent {...allProps} />,
    taskId: 'Task_1',
    queries: {
      ...queries,
    },
  });
};
