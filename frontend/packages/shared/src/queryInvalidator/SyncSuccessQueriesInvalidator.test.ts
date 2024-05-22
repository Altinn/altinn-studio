import { QueryClient } from '@tanstack/react-query';
import { SyncSuccessQueriesInvalidator } from './SyncSuccessQueriesInvalidator';
import { QueryKey } from 'app-shared/types/QueryKey';
import { waitFor } from '@testing-library/react';

jest.mock('@tanstack/react-query');

describe('SyncSuccessQueriesInvalidator', () => {
  let queryClientMock: QueryClient;
  const org = 'testOrg';
  const app = 'testApp';

  beforeEach(() => {
    queryClientMock = new QueryClient();
    queryClientMock.invalidateQueries = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should invalidate query cache only once when invalidateQueryByFileName is called', async () => {
    const instance = SyncSuccessQueriesInvalidator.getInstance(queryClientMock, org, app);

    const fileName = 'applicationmetadata.json';
    instance.invalidateQueryByFileName(fileName);

    await waitFor(() =>
      expect(queryClientMock.invalidateQueries).toHaveBeenCalledWith({
        queryKey: [QueryKey.AppMetadata, org, app],
      }),
    );
    expect(queryClientMock.invalidateQueries).toHaveBeenCalledTimes(1);
  });
});
