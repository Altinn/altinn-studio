import React from 'react';

import { screen } from '@testing-library/react';

import { App } from 'src/App';
import { renderWithInstanceAndLayout, renderWithoutInstanceAndLayout } from 'src/test/renderWithProviders';

describe('App', () => {
  beforeEach(() => {
    jest.spyOn(window, 'logError').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render unknown error when hasApplicationSettingsError', async () => {
    await renderWithoutInstanceAndLayout({
      renderer: () => <App />,
      queries: {
        fetchApplicationSettings: () => Promise.reject(new Error('400 Bad Request')),
      },
    });
    await screen.findByRole('heading', { level: 1, name: 'Ukjent feil' });
  });

  test('should render unknown error when hasApplicationMetadataError', async () => {
    await renderWithInstanceAndLayout({
      renderer: () => <App />,
      queries: {
        fetchApplicationMetadata: () => Promise.reject(new Error('400 Bad Request')),
      },
    });
    await screen.findByRole('heading', { level: 1, name: 'Ukjent feil' });
  });

  test('should render unknown error when hasLayoutSetError', async () => {
    await renderWithInstanceAndLayout({
      renderer: () => <App />,
      queries: {
        fetchLayoutSets: () => Promise.reject(new Error('400 Bad Request')),
      },
    });
    await screen.findByRole('heading', { level: 1, name: 'Ukjent feil' });
  });

  test('should render unknown error when hasOrgsError', async () => {
    await renderWithInstanceAndLayout({
      renderer: () => <App />,
      queries: {
        fetchOrgs: () => Promise.reject(new Error('400 Bad Request')),
      },
    });
    await screen.findByRole('heading', { level: 1, name: 'Ukjent feil' });
  });
});
