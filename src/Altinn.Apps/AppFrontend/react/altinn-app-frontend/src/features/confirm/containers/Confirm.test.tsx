import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';

import { getInitialStateMock } from '../../../../__mocks__/initialStateMock';
import { renderWithProviders } from '../../../../testUtils';

import Confirm, {
  returnConfirmSummaryObject,
} from 'src/features/confirm/containers/Confirm';

describe('features > confirm > Confirm', () => {
  it('should show spinner when loading required data', () => {
    renderWithProviders(
      <MemoryRouter>
        <Confirm />
      </MemoryRouter>,
    );
    const title = screen.queryByText('Se over svarene dine før du sender inn');
    expect(title).not.toBeInTheDocument();

    const contentLoader = screen.getByText('Loading...');
    expect(contentLoader).toBeInTheDocument();
  });

  it('should present confirm information when necessary data is present', () => {
    renderWithProviders(
      <MemoryRouter>
        <Confirm />
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

  it('should show loading when clicking submit', () => {
    renderWithProviders(
      <MemoryRouter>
        <Confirm />
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
    userEvent.click(submitBtn);

    expect(screen.queryByText(submitBtnText)).not.toBeInTheDocument();
    expect(screen.getByText(loadingText)).toBeInTheDocument();
  });

  describe('returnConfirmSummaryObject', () => {
    it('should return sender with ssn prefix when ssn is present', () => {
      const result = returnConfirmSummaryObject({
        languageData: {},
        instanceOwnerParty: {
          partyId: 50001,
          name: 'Ola Privatperson',
          ssn: '01017512345',
        },
      });

      expect(result).toEqual({
        'confirm.sender': '01017512345-Ola Privatperson',
      });
    });

    it('should return sender with ssn prefix when both ssn and orgNumber is present', () => {
      const result = returnConfirmSummaryObject({
        languageData: {},
        instanceOwnerParty: {
          partyId: 50001,
          name: 'Ola Privatperson',
          ssn: '01017512345',
          orgNumber: '987654321',
        },
      });

      expect(result).toEqual({
        'confirm.sender': '01017512345-Ola Privatperson',
      });
    });

    it('should return sender with orgNumber prefix when orgNumber is present', () => {
      const result = returnConfirmSummaryObject({
        languageData: {},
        instanceOwnerParty: {
          partyId: 50001,
          name: 'Ola Bedrift',
          orgNumber: '987654321',
        },
      });

      expect(result).toEqual({
        'confirm.sender': '987654321-Ola Bedrift',
      });
    });

    it('should return sender as empty string when neither ssn or orgNumber is present', () => {
      const result = returnConfirmSummaryObject({
        languageData: {},
        instanceOwnerParty: {
          partyId: 50001,
          name: 'Ola Bedrift',
        },
      });

      expect(result).toEqual({
        'confirm.sender': '',
      });
    });

    it('should return sender as empty string when instanceOwnerParty is not present', () => {
      const result = returnConfirmSummaryObject({
        languageData: {},
      });

      expect(result).toEqual({
        'confirm.sender': '',
      });
    });
  });
});
