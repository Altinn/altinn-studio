import React from 'react';
import { MemoryRouter } from 'react-router-dom';

import { getInitialStateMock } from '__mocks__/initialStateMock';
import {
  applicationMetadataMock,
  getInstanceDataStateMock,
} from '__mocks__/mocks';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from 'testUtils';

import {
  type Props as IConfirmPage,
  ConfirmPage,
} from 'src/features/confirm/containers/ConfirmPage';

import { nb } from 'altinn-shared/language/texts/nb';

describe('ConfirmPage', () => {
  const state = getInstanceDataStateMock();
  const props: IConfirmPage = {
    appName: 'Irrelevant',
    instance: state.instance,
    language: nb(),
    parties: [],
    textResources: [],
    applicationMetadata: applicationMetadataMock,
  };
  it('should present confirm information when necessary data is present', () => {
    renderWithProviders(
      <MemoryRouter>
        <ConfirmPage {...props} />
      </MemoryRouter>,
      {
        preloadedState: getInitialStateMock({
          attachments: { attachments: {} },
        }),
      },
    );
    const title = screen.getByText('Se over svarene dine før du sender inn');
    expect(title).toBeInTheDocument();

    const contentLoader = screen.queryByText('Loading...');
    expect(contentLoader).not.toBeInTheDocument();
  });

  it('should present pdf as part of previously submitted data', () => {
    renderWithProviders(
      <MemoryRouter>
        <ConfirmPage {...props} />
      </MemoryRouter>,
      {
        preloadedState: getInitialStateMock({
          attachments: { attachments: {} },
        }),
      },
    );
    const pdf = screen.getByText('mockApp.pdf');
    expect(pdf).toBeInTheDocument();

    const contentLoader = screen.queryByText('Loading...');
    expect(contentLoader).not.toBeInTheDocument();
  });

  it('should show loading when clicking submit', async () => {
    renderWithProviders(
      <MemoryRouter>
        <ConfirmPage {...props} />
      </MemoryRouter>,
      {
        preloadedState: getInitialStateMock({
          attachments: { attachments: {} },
        }),
      },
    );

    const submitBtnText = /send inn/i;
    const loadingText = /laster innhold/i;

    const submitBtn = screen.getByText(submitBtnText);

    expect(screen.queryByText(loadingText)).not.toBeInTheDocument();
    expect(submitBtn).toBeInTheDocument();
    await userEvent.click(submitBtn);

    expect(screen.queryByText(submitBtnText)).toBeInTheDocument();
    expect(screen.getByText(loadingText)).toBeInTheDocument();
  });
});
