import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render as rtlRender, screen, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';
import { textMock } from '../../../testing/mocks/i18nMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { ResourceAccessLists } from './ResourceAccessLists';
import { ServicesContextProps, ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

const accessListsResponse = [
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
    accessListName: 'List 2',
    accessListIdentifier: 'list2',
  },
];

const defaultProps = {
  env: 'tt02',
  resourceData: {
    identifier: 'res1',
    title: {
      nb: 'Resource 1',
      nn: '',
      en: '',
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

describe('ResourceAccessLists', () => {
  it('should show show spinner on loading', () => {
    render();

    const spinnerTitle = screen.queryByText(textMock('general.loading'));
    expect(spinnerTitle).toBeInTheDocument();
  });
  it('should show selected lists checked', async () => {
    render();

    const spinnerTitle = screen.queryByText(textMock('general.loading'));
    await waitForElementToBeRemoved(spinnerTitle);

    const checkbox1 = screen.getByLabelText('List 1');
    expect(checkbox1).not.toBeChecked();

    const checkbox2 = screen.getByLabelText('List 2');
    expect(checkbox2).toBeChecked();
  });

  it('should show create access list modal when create button is pressed', async () => {
    const user = userEvent.setup();
    render();

    const spinnerTitle = screen.queryByText(textMock('general.loading'));
    await waitForElementToBeRemoved(spinnerTitle);

    const createButton = screen.getByText(textMock('resourceadm.listadmin_create_list'));
    await act(() => user.click(createButton));

    expect(
      screen.getByText(textMock('resourceadm.listadmin_create_list_header', { env: 'TT02' })),
    ).toBeInTheDocument();
  });

  it('should call add when checkbox is checked', async () => {
    const user = userEvent.setup();
    render();

    const spinnerTitle = screen.queryByText(textMock('general.loading'));
    await waitForElementToBeRemoved(spinnerTitle);

    const checkbox1 = screen.getByLabelText('List 1');
    await act(() => user.click(checkbox1));

    expect(checkListMock).toHaveBeenCalled();
  });

  it('should call remove when checkbox is unchecked', async () => {
    const user = userEvent.setup();
    render();

    const spinnerTitle = screen.queryByText(textMock('general.loading'));
    await waitForElementToBeRemoved(spinnerTitle);

    const checkbox2 = screen.getByLabelText('List 2');
    await act(() => user.click(checkbox2));

    expect(uncheckListMock).toHaveBeenCalled();
  });

  it('should show error when loading fails', async () => {
    render(true);

    const spinnerTitle = screen.queryByText(textMock('general.loading'));
    await waitForElementToBeRemoved(spinnerTitle);

    expect(screen.getByText(textMock('resourceadm.listadmin_load_list_error'))).toBeInTheDocument();
  });
});

const render = (hasLoadError?: boolean) => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    removeResourceAccessList: uncheckListMock,
    addResourceAccessList: checkListMock,
    getAccessLists: jest
      .fn()
      .mockImplementation(() =>
        hasLoadError ? Promise.reject({}) : Promise.resolve(accessListsResponse),
      ),
    getResourceAccessLists: jest
      .fn()
      .mockImplementation(() => Promise.resolve(connectedListsResponse)),
  };

  return rtlRender(
    <MemoryRouter>
      <ServicesContextProvider {...allQueries} client={createQueryClientMock()}>
        <ResourceAccessLists {...defaultProps} />
      </ServicesContextProvider>
    </MemoryRouter>,
  );
};
