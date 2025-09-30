import React from 'react';

import { jest } from '@jest/globals';
import { screen } from '@testing-library/react';

import { App } from 'src/App';
import { fetchApplicationMetadata } from 'src/queries/queries';
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
    jest.mocked(fetchApplicationMetadata).mockImplementation(() => Promise.reject(new Error('500 Server Error')));

    await renderWithInstanceAndLayout({
      renderer: () => <App />,
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
