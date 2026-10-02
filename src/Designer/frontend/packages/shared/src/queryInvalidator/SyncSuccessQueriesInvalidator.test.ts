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
    expect(queryClientMock.invalidateQueries).toHaveBeenCalledWith({
      queryKey: [QueryKey.AppValidation, org, app],
    });
    expect(queryClientMock.invalidateQueries).toHaveBeenCalledTimes(2);
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
    expect(queryClientMock.invalidateQueries).toHaveBeenCalledWith({
      queryKey: [QueryKey.AppValidation, org, app],
    });
    expect(queryClientMock.invalidateQueries).toHaveBeenCalledTimes(3);
  });

  it('invalidates process dependencies after a process-state sync', async () => {
    const queriesInvalidator = SyncSuccessQueriesInvalidator.getInstance(queryClientMock, org, app);

    queriesInvalidator.invalidateQueriesByFileLocation('process-state');
    expect(queryClientMock.invalidateQueries).not.toHaveBeenCalled();

    await waitFor(() =>
      expect(queryClientMock.invalidateQueries).toHaveBeenCalledWith({
        queryKey: [QueryKey.FetchBpmn, org, app],
      }),
    );
    const expectedKeys = [
      QueryKey.FetchBpmn,
      QueryKey.AppValidation,
      QueryKey.AppMetadata,
      QueryKey.AppMetadataModelIds,
      QueryKey.AppPolicy,
      QueryKey.LayoutSets,
      QueryKey.LayoutSetsExtended,
      QueryKey.SubformComponents,
      QueryKey.FormLayouts,
      QueryKey.FormLayoutSettings,
      QueryKey.Pages,
    ];
    expectedKeys.forEach((key) =>
      expect(queryClientMock.invalidateQueries).toHaveBeenCalledWith({ queryKey: [key, org, app] }),
    );
    expect(queryClientMock.invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: [QueryKey.ProcessState, org, app],
    });
    expect(queryClientMock.invalidateQueries).toHaveBeenCalledTimes(expectedKeys.length);
  });

  it('should invalidate AppValidation when process.bpmn is synced', async () => {
    const queriesInvalidator = SyncSuccessQueriesInvalidator.getInstance(queryClientMock, org, app);

    queriesInvalidator.invalidateQueriesByFileLocation('process.bpmn');

    await waitFor(() => {
      expect(queryClientMock.invalidateQueries).toHaveBeenCalledWith({
        queryKey: [QueryKey.FetchBpmn, org, app],
      });
    });
    expect(queryClientMock.invalidateQueries).toHaveBeenCalledWith({
      queryKey: [QueryKey.AppValidation, org, app],
    });
  });

  it('should invalidate AppValidation when layout-sets.json is synced', async () => {
    const queriesInvalidator = SyncSuccessQueriesInvalidator.getInstance(queryClientMock, org, app);

    queriesInvalidator.invalidateQueriesByFileLocation('layout-sets.json');

    await waitFor(() => {
      expect(queryClientMock.invalidateQueries).toHaveBeenCalledWith({
        queryKey: [QueryKey.LayoutSets, org, app],
      });
    });
    expect(queryClientMock.invalidateQueries).toHaveBeenCalledWith({
      queryKey: [QueryKey.AppValidation, org, app],
    });
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
    expect(queryClientMock.invalidateQueries).toHaveBeenCalledTimes(3);
  });

  it.each(['layouts', 'Settings.json', 'process.bpmn'])(
    'invalidates SubformComponents when %s is synced',
    async (fileOrFolderName) => {
      const queriesInvalidator = SyncSuccessQueriesInvalidator.getInstance(
        queryClientMock,
        org,
        app,
      );

      queriesInvalidator.invalidateQueriesByFileLocation(fileOrFolderName);

      await waitFor(() =>
        expect(queryClientMock.invalidateQueries).toHaveBeenCalledWith({
          queryKey: [QueryKey.SubformComponents, org, app],
        }),
      );
    },
  );
});
