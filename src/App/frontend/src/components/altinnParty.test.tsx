import React from 'react';

import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { getPartyMock } from 'src/__mocks__/getPartyMock';
import { AltinnParty } from 'src/components/altinnParty';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import type { IAltinnPartyProps } from 'src/components/altinnParty';

const user = userEvent.setup();

const partyWithChildParties = {
  ...getPartyMock(),
  childParties: [
    {
      ...getPartyMock(),
      partyId: 1,
      name: 'Child party 1',
    },
    {
      ...getPartyMock(),
      partyId: 2,
      name: 'Child party 2',
    },
  ],
};

describe('altinnParty', () => {
  it('should call onSelectParty callback with the clicked party', async () => {
    const handleSelectParty = vi.fn();
    await render({ onSelectParty: handleSelectParty });

    const party = screen.getByText(/personnr\. 010175\*\*\*\*\*/i);

    await user.click(party);

    expect(handleSelectParty).toHaveBeenCalledWith(getPartyMock());
  });

  describe('showSubUnits', () => {
    it('should render childParties when party has childParties and showSubUnits is true', async () => {
      await render({
        showSubUnits: true,
        party: partyWithChildParties,
      });

      expect(screen.getByText(/^2$/i)).toBeInTheDocument();
      expect(screen.getByText(/underenheter/i)).toBeInTheDocument();
      expect(screen.getByText(/child party 1/i)).toBeInTheDocument();
      expect(screen.getByText(/child party 2/i)).toBeInTheDocument();
    });

    it('should not render childParties when party has childParties and showSubUnits is false', async () => {
      await render({
        showSubUnits: false,
        party: partyWithChildParties,
      });

      expect(screen.queryByText(/^2$/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/underenheter/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/child party 1/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/child party 2/i)).not.toBeInTheDocument();
    });

    it('should not render childParties when party doesnt have childParties and showSubUnits is true', async () => {
      await render({
        showSubUnits: true,
        party: getPartyMock(),
      });

      expect(screen.queryByText(/^2$/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/underenheter/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/child party 1/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/child party 2/i)).not.toBeInTheDocument();
    });
  });

  it('should mark the selected party as busy and block the others', async () => {
    await render({
      showSubUnits: true,
      party: partyWithChildParties,
      pendingPartyId: partyWithChildParties.partyId,
    });

    const wrapper = screen.getByTestId('AltinnParty-PartyWrapper');
    expect(wrapper).toHaveAttribute('aria-busy', 'true');
    expect(wrapper).toHaveAttribute('aria-disabled', 'false');

    const subUnit = screen.getByText(/child party 1/i).closest('[role="button"]');
    expect(subUnit).toHaveAttribute('aria-busy', 'false');
    expect(subUnit).toHaveAttribute('aria-disabled', 'true');
  });

  describe('should render with correct icon based on what kind of party it is', () => {
    it('should render with person icon if party is a person', async () => {
      await render();
      expect(screen.getByTestId('person-icon')).toBeVisible();
    });

    it('should render with building icon if party is a organization', async () => {
      await render({
        party: {
          ...getPartyMock(),
          orgNumber: '1000000',
          partyTypeName: 2,
        },
      });
      expect(screen.getByTestId('org-icon')).toBeVisible();
    });
  });
});

const render = async (props: Partial<IAltinnPartyProps> = {}) => {
  const allProps = {
    party: getPartyMock(),
    onSelectParty: vi.fn(),
    showSubUnits: false,
    ...props,
  };
  return await renderWithInstanceAndLayout({
    renderer: () => <AltinnParty {...allProps} />,
  });
};
