import React from 'react';
import { MemoryRouter} from 'react-router-dom';
import Confirm from 'src/features/confirm/containers/Confirm';
import { getInitialStateMock } from '../../../__mocks__/initialStateMock';
import { renderWithProviders } from '../../testUtils';
import { screen } from '@testing-library/react';

describe('features > confirm > Confirm.tsx', () => {
  it('should show spinner when loading required data', async () => {
    renderWithProviders(
      <MemoryRouter>
        <Confirm />
      </MemoryRouter>
    );
    const contentLoader = screen.queryByText('Loading...');
    expect(contentLoader).not.toBeNull();
  });

  it('should present confirm information when necessary data is present', async () => {
    renderWithProviders(
      <MemoryRouter>
        <Confirm />
      </MemoryRouter>,
      {
        preloadedState: getInitialStateMock({
          attachments: { attachments: {} },
        }),
      }
    );
    const title = screen.queryByText('Se over svarene dine før du sender inn');
    expect(title).not.toBeNull();

    const contentLoader = screen.queryByText('Loading...');
    expect(contentLoader).toBeNull();
  });
});
