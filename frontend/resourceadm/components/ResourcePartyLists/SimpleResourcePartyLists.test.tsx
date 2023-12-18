import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render as rtlRender, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';
import { textMock } from '../../../testing/mocks/i18nMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { SimpleResourcePartyLists } from './SimpleResourcePartyLists';
import { ServicesContextProps, ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

const partyListsResponse = [
  {
    env: 'tt02',
    identifier: 'list1',
    name: 'List 1',
  },
  {
    env: 'tt02',
    identifier: 'list2',
    name: 'List 2',
  },
];

const connectedListsResponse = [
  {
    resourceIdentifier: 'res1',
    partyListName: 'List 2',
    partyListIdentifier: 'list2',
    actions: [],
  },
];

const defaultProps = {
  env: 'tt02',
  resourceData: {
    identifier: 'res1',
    title: {
      nb: 'Resource 1',
    },
  },
};

const checkListMock = jest.fn();
const uncheckListMock = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({
    selectedContext: 'org1',
  }),
}));

const user = userEvent.setup();

describe('PartyListSearch', () => {
  it('should show show spinner on loading', async () => {
    render();

    const spinnerTitle = screen.queryByText('Laster...');
    expect(spinnerTitle).toBeInTheDocument();
  });
  it('should show selected lists checked', async () => {
    render();

    const spinnerTitle = screen.queryByText('Laster...');
    await waitFor(() => expect(spinnerTitle).not.toBeInTheDocument());

    const checkbox1 = screen.getByLabelText('List 1');
    expect(checkbox1).not.toBeChecked();

    const checkbox2 = screen.getByLabelText('List 2');
    expect(checkbox2).toBeChecked();
  });

  it('should show error when loading party lists or connected lists fail', async () => {});

  it('should show create party list modal when create button is pressed', async () => {
    render();

    const spinnerTitle = screen.queryByText('Laster...');
    await waitFor(() => expect(spinnerTitle).not.toBeInTheDocument());

    const createButton = screen.getByText('Opprett ny enhetsliste');
    await act(() => user.click(createButton));

    expect(screen.getByText('Lag ny enhetsliste i TT02')).toBeInTheDocument();
  });

  it('should call add when checkbox is checked', async () => {
    render();

    const spinnerTitle = screen.queryByText('Laster...');
    await waitFor(() => expect(spinnerTitle).not.toBeInTheDocument());

    const checkbox1 = screen.getByLabelText('List 1');
    await act(() => user.click(checkbox1));

    expect(checkListMock).toHaveBeenCalled();
  });

  it('should call remove when checkbox is unchecked', async () => {
    render();

    const spinnerTitle = screen.queryByText('Laster...');
    await waitFor(() => expect(spinnerTitle).not.toBeInTheDocument());

    const checkbox2 = screen.getByLabelText('List 2');
    await act(() => user.click(checkbox2));

    expect(uncheckListMock).toHaveBeenCalled();
  });
});

const render = () => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    removeResourcePartyList: uncheckListMock,
    addResourcePartyList: checkListMock,
    getPartyLists: jest.fn().mockImplementation(() => Promise.resolve(partyListsResponse)),
    getResourcePartyLists: jest
      .fn()
      .mockImplementation(() => Promise.resolve(connectedListsResponse)),
  };

  return rtlRender(
    <MemoryRouter>
      <ServicesContextProvider {...allQueries} client={createQueryClientMock()}>
        <SimpleResourcePartyLists {...defaultProps} />
      </ServicesContextProvider>
    </MemoryRouter>,
  );
};
