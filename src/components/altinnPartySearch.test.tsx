import React from 'react';

import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { getProfileStateMock } from 'src/__mocks__/profileStateMock';
import { AltinnPartySearch } from 'src/components/altinnPartySearch';
import { renderWithProviders } from 'src/testUtils';
import type { IAltinnPartySearchProps } from 'src/components/altinnPartySearch';

const user = userEvent.setup();

describe('AltinnPartySearch', () => {
  it('should use callback to update when search string is changed', async () => {
    const handleSearchChange = jest.fn();
    render({ onSearchUpdated: handleSearchChange });

    const input = screen.getByRole('textbox', {
      name: 'Søk etter aktør',
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
      profile: getProfileStateMock({ selectedAppLanguage: 'nb' }),
    },
  });
};
