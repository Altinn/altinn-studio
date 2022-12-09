import React from 'react';

import { getInitialStateMock } from '__mocks__/mocks';
import { partyMock } from '__mocks__/partyMock';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from 'testUtils';

import AltinnParty from 'src/shared/components/altinnParty';
import type { IAltinnPartyProps } from 'src/shared/components/altinnParty';

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

    const party = screen.getByText(/party_selection\.unit_personal_number 01017512345/i);

    await user.click(party);

    expect(handleSelectParty).toHaveBeenCalledWith(partyMock);
  });

  describe('showSubUnits', () => {
    it('should render childParties when party has childParties and showSubUnits is true', () => {
      render({
        showSubUnits: true,
        party: partyWithChildParties,
      });

      expect(screen.getByText(/2 party_selection\.unit_type_subunit_plural/i)).toBeInTheDocument();
      expect(screen.getByText(/child party 1/i)).toBeInTheDocument();
      expect(screen.getByText(/child party 2/i)).toBeInTheDocument();
    });

    it('should not render childParties when party has childParties and showSubUnits is false', () => {
      render({
        showSubUnits: false,
        party: partyWithChildParties,
      });

      expect(screen.queryByText(/2 party_selection\.unit_type_subunit_plural/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/child party 1/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/child party 2/i)).not.toBeInTheDocument();
    });

    it('should not render childParties when party doesnt have childParties and showSubUnits is true', () => {
      render({
        showSubUnits: true,
        party: partyMock,
      });

      expect(screen.queryByText(/2 party_selection\.unit_type_subunit_plural/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/child party 1/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/child party 2/i)).not.toBeInTheDocument();
    });
  });

  describe('should render with correct icon based on what kind of party it is', () => {
    it("should render with class 'fa fa-private' if party is a person", () => {
      render();
      const icon = screen.getByTestId('AltinnParty-partyIcon');

      expect(icon).toHaveClass('fa-private');
      expect(icon).not.toHaveClass('fa-corp');
    });

    it("should render with class 'fa fa-corp' if party is a organisation", () => {
      render({
        party: {
          ...partyMock,
          orgNumber: 1000000,
        },
      });
      const icon = screen.getByTestId('AltinnParty-partyIcon');

      expect(icon).toHaveClass('fa-corp');
      expect(icon).not.toHaveClass('fa-private');
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
      language: {
        language: {},
        error: null,
        selectedAppLanguage: 'nb',
      },
    },
  });
};
