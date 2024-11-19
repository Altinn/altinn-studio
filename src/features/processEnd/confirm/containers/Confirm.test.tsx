import React from 'react';

import { screen } from '@testing-library/react';

import { getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import { getPartyMock, getPartyWithSubunitMock } from 'src/__mocks__/getPartyMock';
import { Confirm } from 'src/features/processEnd/confirm/containers/Confirm';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';

describe('Confirm', () => {
  it('should not show loading if required data is loaded', async () => {
    await renderWithInstanceAndLayout({
      renderer: () => <Confirm />,
      queries: {
        fetchParties: () => Promise.resolve([getPartyMock()]),
        fetchCurrentParty: () => Promise.resolve(getPartyMock()),
      },
    });
    const contentLoader = screen.queryByText('Loading...');
    expect(contentLoader).not.toBeInTheDocument();
  });

  it('should have subunit sender name present', async () => {
    const partyMock = getPartyWithSubunitMock();
    const subunitParty = partyMock.org.childParties[0];
    const instance = getInstanceDataMock(undefined, subunitParty.partyId.toString(), undefined, subunitParty.orgNumber);

    await renderWithInstanceAndLayout({
      renderer: () => <Confirm />,
      instanceId: instance.id,
      queries: {
        fetchParties: () => Promise.resolve([partyMock.org]),
        fetchCurrentParty: () => Promise.resolve(subunitParty),
        fetchInstanceData: (partyId: string, instanceGuid: string) => {
          expect(partyId).toBe(subunitParty.partyId.toString());
          expect(instance.id).toContain(instanceGuid);
          return Promise.resolve(instance);
        },
      },
    });

    const orgNumber = screen.getByText(subunitParty.orgNumber ?? '', { exact: false });
    expect(orgNumber).toBeInTheDocument();
    const name = screen.getByText(subunitParty.name, { exact: false });
    expect(name).toBeInTheDocument();
  });
});
