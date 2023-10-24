import React from 'react';

import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { partyMock } from 'src/__mocks__/partyMock';
import { getProfileStateMock } from 'src/__mocks__/profileStateMock';
import { AltinnParty } from 'src/components/altinnParty';
import { renderWithProviders } from 'src/test/renderWithProviders';
import type { IAltinnPartyProps } from 'src/components/altinnParty';

const user = userEvent.setup();

const partyWithChildParties = {
  ...partyMock,
  childParties: [
    {
      ...partyMock,
      partyId: '1',
      name: 'Child party 1',
    },
    {
      ...partyMock,
      partyId: '2',
      name: 'Child party 2',
    },
  ],
};

describe('altinnParty', () => {
  it('should call onSelectParty callback with the clicked party', async () => {
    const handleSelectParty = jest.fn();
    render({ onSelectParty: handleSelectParty });

    const party = screen.getByText(/personnr\. 01017512345/i);

    await user.click(party);

    expect(handleSelectParty).toHaveBeenCalledWith(partyMock);
  });

  describe('showSubUnits', () => {
    it('should render childParties when party has childParties and showSubUnits is true', () => {
      render({
        showSubUnits: true,
        party: partyWithChildParties,
      });

      expect(screen.getByText(/^2$/i)).toBeInTheDocument();
      expect(screen.getByText(/underenheter/i)).toBeInTheDocument();
      expect(screen.getByText(/child party 1/i)).toBeInTheDocument();
      expect(screen.getByText(/child party 2/i)).toBeInTheDocument();
    });

    it('should not render childParties when party has childParties and showSubUnits is false', () => {
      render({
        showSubUnits: false,
        party: partyWithChildParties,
      });

      expect(screen.queryByText(/^2$/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/underenheter/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/child party 1/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/child party 2/i)).not.toBeInTheDocument();
    });

    it('should not render childParties when party doesnt have childParties and showSubUnits is true', () => {
      render({
        showSubUnits: true,
        party: partyMock,
      });

      expect(screen.queryByText(/^2$/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/underenheter/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/child party 1/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/child party 2/i)).not.toBeInTheDocument();
    });
  });

  describe('should render with correct icon based on what kind of party it is', () => {
    it('should render with person icon if party is a person', () => {
      render();
      expect(screen.getByTestId('person-icon')).toBeVisible();
    });

    it('should render with building icon if party is a organisation', () => {
      render({
        party: {
          ...partyMock,
          orgNumber: 1000000,
        },
      });
      expect(screen.getByTestId('org-icon')).toBeVisible();
    });
  });
});

const render = (props: Partial<IAltinnPartyProps> = {}) => {
  const allProps = {
    party: partyMock,
    onSelectParty: jest.fn(),
    showSubUnits: false,
    ...props,
  };
  return renderWithProviders(<AltinnParty {...allProps} />, {
    preloadedState: {
      ...getInitialStateMock(),
      profile: getProfileStateMock({ selectedAppLanguage: 'nb' }),
    },
  });
};
