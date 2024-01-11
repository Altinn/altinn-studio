import React from 'react';

import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { getApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import { getProcessDataMock } from 'src/__mocks__/getProcessDataMock';
import { ConfirmPage, type IConfirmPageProps } from 'src/features/processEnd/confirm/containers/ConfirmPage';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';

describe('ConfirmPage', () => {
  const props: IConfirmPageProps = {
    appName: 'Irrelevant',
    instance: getInstanceDataMock(),
    parties: [],
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
    const { mutations } = await renderWithInstanceAndLayout({
      renderer: () => <ConfirmPage {...props} />,
      queries: {
        fetchProcessState: async () =>
          getProcessDataMock((p) => {
            p.currentTask!.actions = {
              confirm: true,
            };
          }),
      },
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
      expect(screen.getByText(loadingText)).toBeInTheDocument();
    });
  });
});
