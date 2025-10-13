import React from 'react';
import type { PropsWithChildren } from 'react';

import { act, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { getPartyMock, getPartyWithSubunitMock, getServiceOwnerPartyMock } from 'src/__mocks__/getPartyMock';
import { PartySelection } from 'src/features/instantiate/containers/PartySelection';
import { useSelectedParty, useSelectedPartyIsValid } from 'src/features/party/PartiesProvider';
import { renderWithDefaultProviders } from 'src/test/renderWithProviders';

const deletedParty = getPartyMock({
  ssn: '01017512347',
  partyId: 12347,
  name: 'Petter Nordmann',
  isDeleted: true,
});

// Need at least 9 parties to test pagination (twice)
const parties = [
  getPartyMock(),
  getServiceOwnerPartyMock(),
  getPartyWithSubunitMock().org,
  getPartyMock({ ssn: '01017512346', partyId: 12346, name: 'Kari Nordmann' }),
  deletedParty,
  getPartyMock({ ssn: '01017512348', partyId: 12348, name: 'Per Nordmann' }),
  getPartyMock({ ssn: '01017512349', partyId: 12349, name: 'Lise Nordmann' }),
  getPartyMock({ ssn: '01017512350', partyId: 12350, name: 'Anne Nordmann' }),
  getPartyMock({ ssn: '01017512351', partyId: 12351, name: 'Hans Nordmann' }),
  getPartyMock({ ssn: '01017512352', partyId: 12352, name: 'Knut Nordmann' }),
  getPartyMock({ ssn: '01017512353', partyId: 12353, name: 'Bjørn Nordmann' }),
];

function TestWrapper(props: PropsWithChildren) {
  const selectedParty = useSelectedParty();
  const partyIsValid = useSelectedPartyIsValid();
  return (
    <>
      {props.children}
      <div data-testid='valid-party'>{JSON.stringify(partyIsValid)}</div>
      <div data-testid='current-party'>{JSON.stringify(selectedParty?.partyId ?? false)}</div>
    </>
  );
}

describe('PartySelection', () => {
  function render(_parties = parties) {
    return renderWithDefaultProviders({
      renderer: (
        <TestWrapper>
          <PartySelection />
        </TestWrapper>
      ),
      queries: {
        fetchPartiesAllowedToInstantiate: async () => _parties,
      },
    });
  }

  it('should have working pagination', async () => {
    const user = userEvent.setup({ delay: null });
    await render();

    expect(screen.getAllByTestId('AltinnParty-PartyWrapper')).toHaveLength(4);
    await user.click(screen.getByRole('button', { name: /last flere/i }));
    await waitFor(() => expect(screen.getAllByTestId('AltinnParty-PartyWrapper')).toHaveLength(8));
    await user.click(screen.getByRole('button', { name: /last flere/i }));
    await waitFor(() => expect(screen.getAllByTestId('AltinnParty-PartyWrapper')).toHaveLength(10));
    expect(screen.queryByRole('button', { name: /last flere/i })).not.toBeInTheDocument();
  });

  it('pagination should respect search filtering reducing the total count', async () => {
    const user = userEvent.setup({ delay: null });
    await render();
    expect(screen.getAllByTestId('AltinnParty-PartyWrapper')).toHaveLength(4);
    await user.type(screen.getByRole('textbox', { name: /søk/i }), 'Nordmann');
    expect(screen.getAllByTestId('AltinnParty-PartyWrapper')).toHaveLength(4);
    await user.click(screen.getByRole('button', { name: /last flere/i }));
    await waitFor(() => expect(screen.getAllByTestId('AltinnParty-PartyWrapper')).toHaveLength(7));
    expect(screen.queryByRole('button', { name: /last flere/i })).not.toBeInTheDocument();
  });

  it('sub-unit filter should work', async () => {
    const user = userEvent.setup({ delay: null });
    await render();

    expect(screen.getAllByTestId('AltinnParty-PartyWrapper')).toHaveLength(4);
    await user.click(screen.getByRole('button', { name: '1 underenhet' }));
    expect(screen.getByRole('button', { name: /^Subunit Org/ })).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /vis underenheter/i }));
    expect(screen.queryByRole('button', { name: /^Subunit Org/ })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('checkbox', { name: /vis underenheter/i })).not.toBeChecked());
  });

  it('deleted filter should work', async () => {
    const user = userEvent.setup({ delay: null });
    await render();

    expect(screen.getAllByTestId('AltinnParty-PartyWrapper')).toHaveLength(4);
    await user.click(screen.getByRole('button', { name: /last flere/i }));
    await waitFor(() => expect(screen.getAllByTestId('AltinnParty-PartyWrapper')).toHaveLength(8));
    expect(screen.getByRole('button', { name: /^Hans Nordmann/ })).toBeInTheDocument();

    expect(screen.queryByRole('button', { name: /^Petter Nordmann/ })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /vis slettede/i })).not.toBeChecked();
    await user.click(screen.getByRole('checkbox', { name: /vis slettede/i }));
    expect(screen.getByRole('button', { name: /^Petter Nordmann/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Hans Nordmann/ })).not.toBeInTheDocument(); // Pagination limit
  });

  it('deleted filter should be disabled by default when only deleted parties are available', async () => {
    await render([deletedParty]);

    expect(screen.getByRole('checkbox', { name: /vis slettede/i })).toBeChecked();
    expect(screen.getAllByTestId('AltinnParty-PartyWrapper')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Petter Nordmann (slettet) personnr. 01017512347' })).toBeInTheDocument();
  });

  describe('selecting parties', () => {
    const testCases = [
      {
        parties: [getPartyMock({ ssn: '01017512346', partyId: 12346, name: 'Kari Nordmann' })],
        expectedPartyId: 12346,
        partyName: 'Kari Nordmann personnr. 01017512346',
      },
      {
        parties: [getServiceOwnerPartyMock()],
        expectedPartyId: 414234123,
        partyName: 'Brønnøysundregistrene org.nr. 974760673',
      },
      { parties: [getPartyWithSubunitMock().org], expectedPartyId: 1, partyName: 'Root Org org.nr. 123456789' },
      {
        parties: [getPartyWithSubunitMock().org],
        expectedPartyId: 2,
        partyName: 'Subunit Org org.nr. 223456789',
        expandSubunit: true,
      },
    ];

    it.each(testCases)(
      'should be possible to click on ($partyName)',
      async ({ parties, expectedPartyId, partyName, expandSubunit }) => {
        // Clear initial party so useSelectedPartyIsValid returns false
        if (window.AltinnAppData?.userProfile) {
          window.AltinnAppData.userProfile.party = undefined;
        }

        const user = userEvent.setup({ delay: null });
        const { mutations, rerender } = await render(parties);

        expect(screen.getByTestId('valid-party')).toHaveTextContent('false');

        if (expandSubunit) {
          await user.click(screen.getByRole('button', { name: '1 underenhet' }));
        }

        await user.click(screen.getByRole('button', { name: partyName }));
        await waitFor(() => expect(mutations.doSetSelectedParty.mock).toHaveBeenCalled());
        expect(mutations.doSetSelectedParty.mock).toHaveBeenCalledWith(expectedPartyId);

        // Resolve mutation
        act(() => {
          mutations.doSetSelectedParty.resolve('Party successfully updated');
        });

        // Simulate backend updating userProfile.party after successful mutation
        const selectedParty = parties.find((p) => p.partyId === expectedPartyId || p.childParties?.some((c) => c.partyId === expectedPartyId));
        act(() => {
          if (window.AltinnAppData?.userProfile) {
            window.AltinnAppData.userProfile.party = selectedParty?.partyId === expectedPartyId
              ? selectedParty
              : selectedParty?.childParties?.find((c) => c.partyId === expectedPartyId);
          }
          // Force re-render to pick up window changes
          rerender(
            <TestWrapper>
              <PartySelection />
            </TestWrapper>,
          );
        });

        await waitFor(() => expect(screen.getByTestId('current-party')).toHaveTextContent(`${expectedPartyId}`));
        await waitFor(() => expect(screen.getByTestId('valid-party')).toHaveTextContent('true'));
      },
    );
  });
});
