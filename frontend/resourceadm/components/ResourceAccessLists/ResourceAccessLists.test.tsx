import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';
import { textMock } from '../../../testing/mocks/i18nMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import type { ResourceAccessListsProps } from './ResourceAccessLists';
import { ResourceAccessLists } from './ResourceAccessLists';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

const resourceId = 'res1';
const org = 'ttd';
const env = 'tt02';
const list1Id = 'list1';
const list1Name = 'List 1';
const list2Id = 'list2';
const list2Name = 'List 2';
const page2ListName = 'Page 2';

const accessListResults = {
  data: [
    {
      env: 'tt02',
      identifier: list1Id,
      name: list1Name,
      description: 'Test-list 1 description',
      resourceConnections: [],
    },
    {
      env: 'tt02',
      identifier: list2Id,
      name: list2Name,
      description: 'Test-list 2 description',
      resourceConnections: [{ resourceIdentifier: resourceId }],
    },
  ],
  nextPage: 1,
};

const accessListResultsPage2 = {
  data: [
    {
      env: 'tt02',
      identifier: 'page2',
      name: page2ListName,
      description: 'Description page 2',
      resourceConnections: [],
    },
  ],
  nextPage: null,
};

const defaultProps: ResourceAccessListsProps = {
  env: env,
  resourceData: {
    identifier: resourceId,
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
    selectedContext: org,
  }),
}));

describe('ResourceAccessLists', () => {
  afterEach(jest.clearAllMocks);

  it('should show show spinner on loading', () => {
    renderResourceAccessLists();

    const spinnerTitle = screen.queryByText(textMock('general.loading'));
    expect(spinnerTitle).toBeInTheDocument();
  });
  it('should show selected lists checked', async () => {
    renderResourceAccessLists();

    const spinnerTitle = screen.queryByText(textMock('general.loading'));
    await waitForElementToBeRemoved(spinnerTitle);

    const checkbox1 = screen.getByLabelText(list1Name);
    expect(checkbox1).not.toBeChecked();

    const checkbox2 = screen.getByLabelText(list2Name);
    expect(checkbox2).toBeChecked();
  });

  it('should show create access list modal when create button is pressed', async () => {
    const user = userEvent.setup();
    renderResourceAccessLists();

    const spinnerTitle = screen.queryByText(textMock('general.loading'));
    await waitForElementToBeRemoved(spinnerTitle);

    const createButton = screen.getByText(textMock('resourceadm.listadmin_create_list'));
    await act(() => user.click(createButton));

    expect(
      screen.getByText(
        textMock('resourceadm.listadmin_create_list_header', {
          env: textMock('resourceadm.deploy_test_env'),
        }),
      ),
    ).toBeInTheDocument();
  });

  it('should call add when checkbox is checked', async () => {
    const user = userEvent.setup();
    renderResourceAccessLists();

    const spinnerTitle = screen.queryByText(textMock('general.loading'));
    await waitForElementToBeRemoved(spinnerTitle);

    const checkbox1 = screen.getByLabelText(list1Name);
    await act(() => user.click(checkbox1));

    expect(checkListMock).toHaveBeenCalledWith(org, resourceId, list1Id, env);
  });

  it('should call remove when checkbox is unchecked', async () => {
    const user = userEvent.setup();
    renderResourceAccessLists();

    const spinnerTitle = screen.queryByText(textMock('general.loading'));
    await waitForElementToBeRemoved(spinnerTitle);

    const checkbox2 = screen.getByLabelText(list2Name);
    await act(() => user.click(checkbox2));

    expect(uncheckListMock).toHaveBeenCalledWith(org, resourceId, list2Id, env);
  });

  it('should load more lists when load more button is clicked', async () => {
    const user = userEvent.setup();
    const getResourceAccessListsMock = jest
      .fn()
      .mockImplementationOnce(() => Promise.resolve(accessListResults))
      .mockImplementationOnce(() => Promise.resolve(accessListResultsPage2));
    renderResourceAccessLists(getResourceAccessListsMock);

    const spinnerTitle = screen.queryByText(textMock('general.loading'));
    await waitForElementToBeRemoved(spinnerTitle);

    await waitFor(() => screen.findByText(textMock('resourceadm.listadmin_load_more')));
    await act(() => user.click(screen.getByText(textMock('resourceadm.listadmin_load_more'))));

    expect(await screen.findByText(page2ListName)).toBeInTheDocument();
  });

  it('should show error when loading fails', async () => {
    const getResourceAccessListsMock = jest.fn().mockImplementation(() => Promise.reject({}));
    renderResourceAccessLists(getResourceAccessListsMock);

    const spinnerTitle = screen.queryByText(textMock('general.loading'));
    await waitForElementToBeRemoved(spinnerTitle);

    expect(screen.getByText(textMock('resourceadm.listadmin_load_list_error'))).toBeInTheDocument();
  });
});

const renderResourceAccessLists = (getResourceAccessListsMock?: jest.Mock) => {
  const getResourceAccessListsMockFn =
    getResourceAccessListsMock ??
    jest.fn().mockImplementation(() => Promise.resolve(accessListResults));
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    removeResourceAccessList: uncheckListMock,
    addResourceAccessList: checkListMock,
    getResourceAccessLists: getResourceAccessListsMockFn,
  };

  return render(
    <MemoryRouter>
      <ServicesContextProvider {...allQueries} client={createQueryClientMock()}>
        <ResourceAccessLists {...defaultProps} />
      </ServicesContextProvider>
    </MemoryRouter>,
  );
};
