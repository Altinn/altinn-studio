import React from 'react';
import type { PropsWithChildren } from 'react';

import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { getPartyMock, getPartyWithSubunitMock, getServiceOwnerPartyMock } from 'src/__mocks__/getPartyMock';
import { PartySelection } from 'src/features/instantiate/containers/PartySelection';
import { useSelectedParty, useSelectedPartyIsValid } from 'src/features/party/PartiesProvider';
import { renderWithDefaultProviders } from 'src/test/renderWithProviders';
import type { PartyApi } from 'src/core/api-client/party.api';

const deletedParty = getPartyMock({
  ssn: '050575*****',
  partyId: 12347,
  name: 'Petter Nordmann',
  isDeleted: true,
});

// Need at least 9 parties to test pagination (twice)
const parties = [
  getPartyMock({ ssn: '010175*****' }),
  getServiceOwnerPartyMock(),
  getPartyWithSubunitMock().org,
  getPartyMock({ ssn: '020275*****', partyId: 12346, name: 'Kari Nordmann' }),
  deletedParty,
  getPartyMock({ ssn: '030375*****', partyId: 12348, name: 'Per Nordmann' }),
  getPartyMock({ ssn: '040475*****', partyId: 12349, name: 'Lise Nordmann' }),
  getPartyMock({ ssn: '060675*****', partyId: 12350, name: 'Anne Nordmann' }),
  getPartyMock({ ssn: '070775*****', partyId: 12351, name: 'Hans Nordmann' }),
  getPartyMock({ ssn: '080875*****', partyId: 12352, name: 'Knut Nordmann' }),
  getPartyMock({ ssn: '090975*****', partyId: 12353, name: 'Bjørn Nordmann' }),
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
  function render(_parties = parties, setPartiesMock?: PartyApi['setSelectedParty']) {
    return renderWithDefaultProviders({
      renderer: (
        <TestWrapper>
          <PartySelection />
        </TestWrapper>
      ),
      apis: {
        partyApi: {
          getPartiesAllowedToInstantiateHierarchical: async () => _parties,
          ...(setPartiesMock ? { setSelectedParty: setPartiesMock } : {}),
        },
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

  it('should find an organization when searching for an org number containing whitespace', async () => {
    const user = userEvent.setup({ delay: null });
    await render();

    await user.type(screen.getByRole('textbox', { name: /søk/i }), '974 760 673');

    expect(screen.getAllByTestId('AltinnParty-PartyWrapper')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Brønnøysundregistrene org.nr. 974760673' })).toBeInTheDocument();
  });

  it('should find a person when searching for an SSN containing whitespace', async () => {
    const user = userEvent.setup({ delay: null });
    await render();

    await user.type(screen.getByRole('textbox', { name: /søk/i }), '01 01 75');

    expect(screen.getAllByTestId('AltinnParty-PartyWrapper')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Ola Privatperson personnr. 010175*****' })).toBeInTheDocument();
  });

  it('should not find parties when searching for letters together with matching numbers', async () => {
    const user = userEvent.setup({ delay: null });
    await render();
    const searchInput = screen.getByRole('textbox', { name: /søk/i });

    await user.type(searchInput, 'abc010175');
    expect(screen.queryAllByTestId('AltinnParty-PartyWrapper')).toHaveLength(0);

    await user.clear(searchInput);
    await user.type(searchInput, 'abc974760673');
    expect(screen.queryAllByTestId('AltinnParty-PartyWrapper')).toHaveLength(0);
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
    expect(screen.getByRole('button', { name: 'Petter Nordmann (slettet) personnr. 050575*****' })).toBeInTheDocument();
  });

  describe('selecting parties', () => {
    const testCases = [
      {
        parties: [getPartyMock({ ssn: '010175*****', partyId: 12346, name: 'Kari Nordmann' })],
        expectedPartyId: 12346,
        partyName: 'Kari Nordmann personnr. 010175*****',
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
        const setSelectedPartyMock = vi.fn(async () => 'Party successfully updated' as const);
        const user = userEvent.setup({ delay: null });
        await render(parties, setSelectedPartyMock);

        expect(screen.getByTestId('valid-party')).toHaveTextContent('false');

        if (expandSubunit) {
          await user.click(screen.getByRole('button', { name: '1 underenhet' }));
        }

        await user.click(screen.getByRole('button', { name: partyName }));
        await waitFor(() => expect(setSelectedPartyMock).toHaveBeenCalled());
        expect(setSelectedPartyMock).toHaveBeenCalledWith({ partyId: expectedPartyId });
        await waitFor(() => expect(screen.getByTestId('current-party')).toHaveTextContent(`${expectedPartyId}`));
        await waitFor(() => expect(screen.getByTestId('valid-party')).toHaveTextContent('true'));
      },
    );
  });
});
