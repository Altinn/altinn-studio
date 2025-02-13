import { QueryClient } from '@tanstack/react-query';
import { EntityUpdatedQueriesInvalidator } from './EntityUpdatedQueriesInvalidator';
import { QueryKey } from 'app-shared/types/QueryKey';
import { waitFor } from '@testing-library/react';
import { org, app } from '@studio/testing/testids';

jest.mock('@tanstack/react-query');

describe('EntityUpdatedQueriesInvalidator', () => {
  let queryClientMock: QueryClient;

  beforeEach(async () => {
    EntityUpdatedQueriesInvalidator.resetInstance();
    queryClientMock = new QueryClient();
    queryClientMock.invalidateQueries = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should invalidate query cache only once when invalidateQueriesByResourceName is called for a resource', async () => {
    const queriesInvalidator = EntityUpdatedQueriesInvalidator.getInstance(
      queryClientMock,
      org,
      app,
    );

    const resourceName = 'Deployment';
    queriesInvalidator.invalidateQueriesByResourceName(resourceName);
    queriesInvalidator.invalidateQueriesByResourceName(resourceName);

    await waitFor(() =>
      expect(queryClientMock.invalidateQueries).toHaveBeenCalledWith({
        queryKey: [QueryKey.AppDeployments, org, app],
      }),
    );
    expect(queryClientMock.invalidateQueries).toHaveBeenCalledTimes(1);
  });

  it('should not invalidate query cache when invalidateQueriesByResourceName is called with an unknown resource name', async () => {
    const queriesInvalidator = EntityUpdatedQueriesInvalidator.getInstance(
      queryClientMock,
      org,
      app,
    );

    const resourceName = 'UnknownResource';
    queriesInvalidator.invalidateQueriesByResourceName(resourceName);

    await new Promise((resolve) => setTimeout(resolve, 501));
    expect(queryClientMock.invalidateQueries).not.toHaveBeenCalled();
  });

  it('should invalidate queries with correct cache keys when invalidateQueriesByResourceName is called for a known resource', async () => {
    const queriesInvalidator = EntityUpdatedQueriesInvalidator.getInstance(
      queryClientMock,
      org,
      app,
    );

    const resourceName = 'Deployment';
    queriesInvalidator.invalidateQueriesByResourceName(resourceName);

    await waitFor(() => {
      expect(queryClientMock.invalidateQueries).toHaveBeenCalledWith({
        queryKey: [QueryKey.AppDeployments, org, app],
      });
    });
    expect(queryClientMock.invalidateQueries).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple resource invalidations correctly', async () => {
    const queriesInvalidator = EntityUpdatedQueriesInvalidator.getInstance(
      queryClientMock,
      org,
      app,
    );

    queriesInvalidator.invalidateQueriesByResourceName('Deployment');
    queriesInvalidator.invalidateQueriesByResourceName('Deployment'); // Same resource, should be called once
    queriesInvalidator.invalidateQueriesByResourceName('UnknownResource'); // Should do nothing

    await waitFor(() => {
      expect(queryClientMock.invalidateQueries).toHaveBeenCalledWith({
        queryKey: [QueryKey.AppDeployments, org, app],
      });
    });

    expect(queryClientMock.invalidateQueries).toHaveBeenCalledTimes(1);
  });
});
