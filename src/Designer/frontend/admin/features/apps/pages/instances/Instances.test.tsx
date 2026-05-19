import { render, screen, waitFor } from '@testing-library/react';
import { Instances } from './Instances';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { app, org } from '@studio/testing/testids';
import axios from 'axios';
import { createApiErrorMock } from 'app-shared/mocks/apiErrorMock';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import { useQueryParamState } from 'admin/features/apps/hooks/useQueryParamState';
import { OrgContext } from 'admin/contexts/OrgContext';

const env = 'test';

const orgMock = {
  username: org,
  full_name: 'Test Org',
  avatar_url: '',
  id: 1,
};

jest.mock('admin/hooks/useRequiredRoutePathsParams', () => ({
  useRequiredRoutePathsParams: () => ({ owner: org, environment: env, app }),
}));
jest.mock('axios', () => ({
  ...jest.requireActual('axios'),
  get: jest.fn(),
}));
jest.mock('admin/features/apps/hooks/useQueryParamState');

describe('Instances', () => {
  beforeEach(() => {
    jest
      .mocked(useQueryParamState)
      .mockImplementation((_key, defaultValue) => [defaultValue, jest.fn()]);
  });
  afterEach(jest.clearAllMocks);

  it('should render filters while loading', () => {
    (axios.get as jest.Mock).mockReturnValue(new Promise(() => {}));

    renderInstances();

    expect(
      screen.getByLabelText(textMock('admin.instances.archive_reference')),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: textMock('admin.instances.status.completed') }),
    ).toBeInTheDocument();
  });

  it('should hide filters when instances query returns 403', async () => {
    const axiosError = createApiErrorMock(ServerCodes.Forbidden);
    (axios.get as jest.Mock).mockRejectedValue(axiosError);

    renderInstances();

    await waitFor(() => {
      expect(
        screen.queryByLabelText(textMock('admin.instances.archive_reference')),
      ).not.toBeInTheDocument();
    });

    expect(
      screen.queryByRole('combobox', { name: textMock('admin.instances.status.completed') }),
    ).not.toBeInTheDocument();
  });
});

const renderInstances = () => {
  render(
    <MemoryRouter>
      <OrgContext.Provider value={orgMock}>
        <QueryClientProvider client={createQueryClientMock()}>
          <Instances />
        </QueryClientProvider>
      </OrgContext.Provider>
    </MemoryRouter>,
  );
};
