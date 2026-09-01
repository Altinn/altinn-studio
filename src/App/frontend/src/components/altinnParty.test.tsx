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

  describe('selected state', () => {
    it('should mark the party as selected when selectedPartyId matches', async () => {
      await render({ selectedPartyId: getPartyMock().partyId });

      const wrapper = screen.getByTestId('AltinnParty-PartyWrapper');
      expect(wrapper).toHaveAttribute('aria-busy', 'true');
      expect(wrapper).toHaveAttribute('aria-disabled', 'false');
      expect(wrapper).toHaveClass('partyWrapperSelected');
    });

    it('should mark the party as blocked when another party is selected', async () => {
      await render({ selectedPartyId: getPartyMock().partyId + 1 });

      const wrapper = screen.getByTestId('AltinnParty-PartyWrapper');
      expect(wrapper).toHaveAttribute('aria-busy', 'false');
      expect(wrapper).toHaveAttribute('aria-disabled', 'true');
      expect(wrapper).not.toHaveClass('partyWrapperSelected');
      expect(wrapper).not.toHaveClass('partyWrapperSelectable');
    });

    it('should be selectable when no selection is in flight', async () => {
      await render();

      const wrapper = screen.getByTestId('AltinnParty-PartyWrapper');
      expect(wrapper).toHaveAttribute('aria-busy', 'false');
      expect(wrapper).toHaveAttribute('aria-disabled', 'false');
      expect(wrapper).not.toHaveClass('partyWrapperSelected');
      expect(wrapper).toHaveClass('partyWrapperSelectable');
    });

    it('should mark the sub-unit as selected when selectedPartyId matches a child party', async () => {
      await render({
        showSubUnits: true,
        party: partyWithChildParties,
        selectedPartyId: 1,
      });

      const subUnit = screen.getByText(/child party 1/i).closest('[role="button"]');
      expect(subUnit).toHaveAttribute('aria-busy', 'true');
      expect(subUnit).toHaveAttribute('aria-disabled', 'false');
      expect(subUnit).toHaveClass('subUnitSelected');

      const otherSubUnit = screen.getByText(/child party 2/i).closest('[role="button"]');
      expect(otherSubUnit).toHaveAttribute('aria-busy', 'false');
      expect(otherSubUnit).toHaveAttribute('aria-disabled', 'true');
      expect(otherSubUnit).not.toHaveClass('subUnitSelected');
      expect(otherSubUnit).not.toHaveClass('subUnitSelectable');
    });

    it('should never mark a party without access as selected', async () => {
      const party = { ...getPartyMock(), onlyHierarchyElementWithNoAccess: true };
      await render({ party, selectedPartyId: party.partyId });

      const wrapper = screen.getByTestId('AltinnParty-PartyWrapper');
      expect(wrapper).toHaveAttribute('aria-busy', 'false');
      expect(wrapper).toHaveAttribute('aria-disabled', 'true');
      expect(wrapper.parentElement).toHaveClass('partyPaperDisabled');
      expect(wrapper).not.toHaveClass('partyWrapperSelected');
    });
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
