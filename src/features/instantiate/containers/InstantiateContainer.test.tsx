import React from 'react';

import { jest } from '@jest/globals';
import { screen, waitFor } from '@testing-library/react';

import { getIncomingApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { InstantiateContainer } from 'src/features/instantiate/containers/InstantiateContainer';
import { fetchApplicationMetadata } from 'src/queries/queries';
import { renderWithoutInstanceAndLayout } from 'src/test/renderWithProviders';

describe('InstantiateContainer', () => {
  it('should show that the service cannot be started when instantiation responds with 410', async () => {
    jest.spyOn(window, 'logError').mockImplementation(() => {});
    const { mutations } = await renderWithoutInstanceAndLayout({
      renderer: () => <InstantiateContainer />,
      waitUntilLoaded: false,
    });

    await waitFor(() => expect(mutations.doInstantiate.mock).toHaveBeenCalledTimes(1));
    mutations.doInstantiate.reject(Object.assign(new Error('Gone'), { isAxiosError: true, response: { status: 410 } }));

    expect(await screen.findByText('Du kan ikke starte denne tjenesten')).toBeInTheDocument();
    expect(screen.getByTestId('StatusCode')).toHaveTextContent('Feil 410');
    expect(screen.queryByText(/du mangler rettigheter/i)).not.toBeInTheDocument();
  });

  it('should not try to instantiate when validTo has passed', async () => {
    jest
      .mocked(fetchApplicationMetadata)
      .mockImplementationOnce(async () => getIncomingApplicationMetadataMock({ validTo: '2020-01-01T00:00:00Z' }));
    const { mutations } = await renderWithoutInstanceAndLayout({
      renderer: () => <InstantiateContainer />,
      waitUntilLoaded: false,
    });

    expect(await screen.findByText('Du kan ikke starte denne tjenesten')).toBeInTheDocument();
    expect(mutations.doInstantiate.mock).not.toHaveBeenCalled();
  });

  it('should not try to instantiate before validFrom, and say when the service opens', async () => {
    jest
      .mocked(fetchApplicationMetadata)
      .mockImplementationOnce(async () => getIncomingApplicationMetadataMock({ validFrom: '2099-01-01T10:00:00Z' }));
    const { mutations } = await renderWithoutInstanceAndLayout({
      renderer: () => <InstantiateContainer />,
      waitUntilLoaded: false,
    });

    expect(await screen.findByText('Denne tjenesten har ikke åpnet ennå')).toBeInTheDocument();
    expect(screen.getByText(/Tjenesten åpner 01\.01\.2099/)).toBeInTheDocument();
    expect(mutations.doInstantiate.mock).not.toHaveBeenCalled();
  });
});
