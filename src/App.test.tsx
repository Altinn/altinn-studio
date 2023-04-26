import React from 'react';

import { screen } from '@testing-library/react';

import { App } from 'src/App';
import { renderWithProviders } from 'src/testUtils';

describe('App', () => {
  test('should render unknown error when hasApplicationSettingsError', async () => {
    const queries = {
      fetchApplicationSettings: () => Promise.reject(),
    };
    renderWithProviders(<App />, {}, queries);
    await screen.findByRole('heading', { level: 1, name: 'Ukjent feil' });
  });

  test('should render unknown error when hasApplicationMetadataError', async () => {
    const queries = {
      fetchApplicationMetadata: () => Promise.reject(),
    };
    renderWithProviders(<App />, {}, queries);
    await screen.findByRole('heading', { level: 1, name: 'Ukjent feil' });
  });

  test('should render unknown error when hasLayoutSetError', async () => {
    const queries = {
      fetchLayoutSets: () => Promise.reject(),
    };
    renderWithProviders(<App />, {}, queries);
    await screen.findByRole('heading', { level: 1, name: 'Ukjent feil' });
  });

  test('should render unknown error when hasOrgsError', async () => {
    const queries = {
      fetchOrgs: () => Promise.reject(),
    };
    renderWithProviders(<App />, {}, queries);
    await screen.findByRole('heading', { level: 1, name: 'Ukjent feil' });
  });
});
