import React from 'react';

import { getInitialStateMock } from '__mocks__/initialStateMock';
import { screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from 'testUtils';

import AltinnPartySearch from 'src/shared/components/altinnPartySearch';
import type { IAltinnPartySearchProps } from 'src/shared/components/altinnPartySearch';

const user = userEvent.setup();

describe('AltinnPartySearch', () => {
  it('should use callback to update when search string is changed', async () => {
    const handleSearchChange = jest.fn();
    render({ onSearchUpdated: handleSearchChange });

    const input = screen.getByRole('textbox', {
      name: /party_selection\.search_placeholder/i,
    });

    await act(() => user.type(input, 'Hello world'));

    expect(handleSearchChange).toHaveBeenCalledWith('Hello world');
  });
});

const render = (props: Partial<IAltinnPartySearchProps> = {}) => {
  const allProps = {
    onSearchUpdated: jest.fn(),
    ...props,
  };

  renderWithProviders(<AltinnPartySearch {...allProps} />, {
    preloadedState: {
      ...getInitialStateMock(),
      language: {
        language: {},
        error: null,
        selectedAppLanguage: 'nb',
      },
    },
  });
};
