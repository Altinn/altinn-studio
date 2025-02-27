import { QueryClient } from '@tanstack/react-query';
import { SyncSuccessQueriesInvalidator } from './SyncSuccessQueriesInvalidator';
import { QueryKey } from 'app-shared/types/QueryKey';
import { waitFor } from '@testing-library/react';
import { org, app, selectedLayoutSet } from '@studio/testing/testids';

jest.mock('@tanstack/react-query');

describe('SyncSuccessQueriesInvalidator', () => {
  let queryClientMock: QueryClient;

  beforeEach(async () => {
    SyncSuccessQueriesInvalidator.resetInstance();
    queryClientMock = new QueryClient();
    queryClientMock.invalidateQueries = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should invalidate query cache only once when invalidateQueriesByFileLocation is called', async () => {
    const queriesInvalidator = SyncSuccessQueriesInvalidator.getInstance(queryClientMock, org, app);

    const fileName = 'applicationmetadata.json';
    queriesInvalidator.invalidateQueriesByFileLocation(fileName);
    queriesInvalidator.invalidateQueriesByFileLocation(fileName);
    await waitFor(() =>
      expect(queryClientMock.invalidateQueries).toHaveBeenCalledWith({
        queryKey: [QueryKey.AppMetadata, org, app],
      }),
    );
    expect(queryClientMock.invalidateQueries).toHaveBeenCalledTimes(1);
  });

  it('should not invalidate query cache when invalidateQueriesByFileLocation is called with an unknown file name', async () => {
    const queriesInvalidator = SyncSuccessQueriesInvalidator.getInstance(queryClientMock, org, app);

    const fileName = 'unknown.json';
    queriesInvalidator.invalidateQueriesByFileLocation(fileName);

    await new Promise((resolve) => setTimeout(resolve, 501));
    expect(queryClientMock.invalidateQueries).not.toHaveBeenCalled();
  });

  it('should invalidate query cache with layoutSetName identifier when invalidateQueriesByFileLocation is called and layoutSetName has been set', async () => {
    const queriesInvalidator = SyncSuccessQueriesInvalidator.getInstance(queryClientMock, org, app);
    queriesInvalidator.layoutSetName = selectedLayoutSet;

    const fileName = 'Settings.json';
    queriesInvalidator.invalidateQueriesByFileLocation(fileName);

    await waitFor(() => {
      expect(queryClientMock.invalidateQueries).toHaveBeenCalledWith({
        queryKey: [QueryKey.FormLayoutSettings, org, app, selectedLayoutSet],
      });
    });
    expect(queryClientMock.invalidateQueries).toHaveBeenCalledTimes(1);
  });

  it('should invalidate layouts query cache with layoutSetName identifier when invalidateQueriesByFileLocation is called and layoutSetName has been set', async () => {
    const queriesInvalidator = SyncSuccessQueriesInvalidator.getInstance(queryClientMock, org, app);
    queriesInvalidator.layoutSetName = selectedLayoutSet;

    const folderName = 'layouts';
    queriesInvalidator.invalidateQueriesByFileLocation(folderName);

    await waitFor(() =>
      expect(queryClientMock.invalidateQueries).toHaveBeenCalledWith({
        queryKey: [QueryKey.FormLayouts, org, app],
      }),
    );
    expect(queryClientMock.invalidateQueries).toHaveBeenCalledTimes(2);
  });
});
