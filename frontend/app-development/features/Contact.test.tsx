import React from 'react';
import { screen } from '@testing-library/react';
import { Contact } from './Contact';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { renderWithProviders } from '../test/testUtils';

// Test data
const org = 'org';
const app = 'app';
const title = 'test';

describe('Contact', () => {
  it('renders component', async () => {
    render();

    expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: app })).not.toBeInTheDocument();
  });
});

const render = () => {
  return renderWithProviders(<Contact />, {
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}`,
  });
};
