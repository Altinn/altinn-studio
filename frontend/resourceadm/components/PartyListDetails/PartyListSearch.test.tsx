import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render as rtlRender, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';
import { textMock } from '../../../testing/mocks/i18nMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { PartyListSearch } from './PartyListSearch';
import { ServicesContextProps, ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

const handleAddMemberMock = jest.fn();

const defaultProps = {
  existingMembers: [
    {
      orgNr: '123456789',
      orgName: '',
      isUnderenhet: false,
    },
  ],
  handleAddMember: handleAddMemberMock,
};

const user = userEvent.setup();

describe('PartyListSearch', () => {
  it('should call handleAddMember when enhet is selected', async () => {
    render({
      getEnheter: jest.fn().mockImplementation(() =>
        Promise.resolve({
          _embedded: {
            enheter: [{ organisasjonsnummer: '123456789', navn: 'Digdir' }],
          },
        }),
      ),
      getUnderenheter: jest.fn().mockImplementation(() =>
        Promise.resolve({
          _embedded: {
            underenheter: [{ organisasjonsnummer: '987654321', navn: 'Under Digdir' }],
          },
        }),
      ),
    });

    const searchField = screen.getByTestId('enhet-search');
    await act(() => user.type(searchField, 'Digdir'));

    await waitFor(() => screen.findByText('987654321 - Under Digdir'));
    const searchResultsButton = screen.getByText('987654321 - Under Digdir');
    await act(() => user.click(searchResultsButton));

    expect(handleAddMemberMock).toHaveBeenCalled();
  });

  it('should show spinner when loading enheter', async () => {
    render({
      getEnheter: jest.fn().mockImplementation(() => Promise.resolve({})),
      getUnderenheter: jest.fn().mockImplementation(() => Promise.resolve({})),
    });

    const searchField = screen.getByTestId('enhet-search');
    await act(() => user.type(searchField, 'Digdir'));
    await waitFor(() => {
      expect(screen.getByText(textMock('general.loading'))).toBeInTheDocument();
    });
  });

  it('should show message when no enheter are found', async () => {
    render({
      getEnheter: jest.fn().mockImplementation(() => Promise.resolve({})),
      getUnderenheter: jest.fn().mockImplementation(() => Promise.resolve({})),
    });

    const searchField = screen.getByTestId('enhet-search');
    await act(() => user.type(searchField, 'Digdir'));
    await waitFor(() => {
      expect(screen.getByText(textMock('general.loading'))).toBeInTheDocument();
    });
  });
});

const render = (queries: Partial<ServicesContextProps> = {}) => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    ...queries,
  };

  return rtlRender(
    <MemoryRouter>
      <ServicesContextProvider {...allQueries} client={createQueryClientMock()}>
        <PartyListSearch {...defaultProps} />
      </ServicesContextProvider>
    </MemoryRouter>,
  );
};
