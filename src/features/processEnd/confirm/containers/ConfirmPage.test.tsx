import React from 'react';

import { jest } from '@jest/globals';
import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { getApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import { getPartyMock, getPartyWithSubunitMock } from 'src/__mocks__/getPartyMock';
import { getProcessDataMock } from 'src/__mocks__/getProcessDataMock';
import { ConfirmPage, type IConfirmPageProps } from 'src/features/processEnd/confirm/containers/ConfirmPage';
import { fetchProcessState } from 'src/queries/queries';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';

describe('ConfirmPage', () => {
  const personParty = getPartyMock();
  const props: IConfirmPageProps = {
    appName: 'Irrelevant',
    instance: getInstanceDataMock(),
    instanceOwnerParty: getPartyMock(),
    applicationMetadata: getApplicationMetadataMock(),
  };
  it('should present confirm information when necessary data is present', async () => {
    await renderWithInstanceAndLayout({
      renderer: () => <ConfirmPage {...props} />,
    });
    const title = screen.getByText('Se over svarene dine før du sender inn');
    expect(title).toBeInTheDocument();

    const contentLoader = screen.queryByText('Loading...');
    expect(contentLoader).not.toBeInTheDocument();
  });

  it('should have person sender name present', async () => {
    await renderWithInstanceAndLayout({
      renderer: () => <ConfirmPage {...props} />,
    });

    const ssn = screen.getByText(personParty.ssn ?? '', { exact: false });
    expect(ssn).toBeInTheDocument();
    const name = screen.getByText(personParty.name, { exact: false });
    expect(name).toBeInTheDocument();
  });

  it('should have subunit sender name present', async () => {
    const partyMock = getPartyWithSubunitMock();
    const subunitParty = (props.instanceOwnerParty = partyMock.org.childParties[0]);
    props.instance = getInstanceDataMock(
      undefined,
      subunitParty.partyId,
      undefined,
      subunitParty.orgNumber,
      subunitParty,
    );
    await renderWithInstanceAndLayout({
      renderer: () => <ConfirmPage {...props} />,
    });

    const orgNumber = screen.getByText(subunitParty.orgNumber ?? '', { exact: false });
    expect(orgNumber).toBeInTheDocument();
    const name = screen.getByText(subunitParty.name, { exact: false });
    expect(name).toBeInTheDocument();
  });

  it('should present pdf as part of previously submitted data', async () => {
    await renderWithInstanceAndLayout({
      renderer: () => <ConfirmPage {...props} />,
    });
    const pdf = screen.getByText('mockApp');
    expect(pdf).toBeInTheDocument();

    const contentLoader = screen.queryByText('Loading...');
    expect(contentLoader).not.toBeInTheDocument();
  });

  it('should show loading when clicking submit', async () => {
    jest.mocked(fetchProcessState).mockImplementation(async () =>
      getProcessDataMock((p) => {
        p.currentTask!.actions = {
          confirm: true,
        };
      }),
    );

    const { mutations } = await renderWithInstanceAndLayout({
      renderer: () => <ConfirmPage {...props} />,
    });

    const submitBtnText = /send inn/i;
    const loadingText = /laster innhold/i;

    const submitBtn = screen.getByRole('button', { name: submitBtnText });

    expect(mutations.doProcessNext.mock).toHaveBeenCalledTimes(0);
    expect(screen.queryByText(loadingText)).not.toBeInTheDocument();
    expect(submitBtn).toBeInTheDocument();
    await userEvent.click(submitBtn);

    expect(mutations.doProcessNext.mock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: submitBtnText })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByLabelText(loadingText)).toBeInTheDocument();
    });
  });
});
