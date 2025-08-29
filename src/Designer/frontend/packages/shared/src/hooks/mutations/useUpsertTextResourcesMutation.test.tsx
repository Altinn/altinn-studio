import type {
  UpsertTextResourcesMutationArgs,
  UseUpsertTextResourceMutationResult,
} from './useUpsertTextResourcesMutation';
import { useUpsertTextResourcesMutation } from './useUpsertTextResourcesMutation';
import type {
  ITextResource,
  ITextResources,
  ITextResourcesWithLanguage,
} from 'app-shared/types/global';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';
import type { AppRouteParams } from '../../types/AppRouteParams';
import type { RenderHookResult } from '@testing-library/react';
import { waitFor } from '@testing-library/react';
import type { QueryClient, QueryKey as TanstackQueryKey } from '@tanstack/react-query';
import { createQueryClientMock } from '../../mocks/queryClientMock';
import { QueryKey } from '../../types/QueryKey';
import { emptyTextResourceListMock } from '../../mocks/emptyTextResourceListMock';

// Test data:
const org = 'organisation';
const app = 'application';
const appRouteParams: AppRouteParams = { org, app };
const key: TanstackQueryKey = [QueryKey.TextResources, org, app];
const language1 = 'nb';
const language2 = 'en';
const text1Id = 'testid1';
const text1Lang1Value = 'Testverdi 1';
const text1Lang2Value = 'Test value 1';
const text2Id = 'testid2';
const text2Lang1Value = 'Testverdi 2';
const text2Lang2Value = 'Test value 2';
const text3Id = 'testid3';
const text3Lang1Value = 'Testverdi 3';
const text3Lang2Value = 'Test value 3';
const lang1TextResources: ITextResource[] = [
  { id: text1Id, value: text1Lang1Value },
  { id: text2Id, value: text2Lang1Value },
  { id: text3Id, value: text3Lang1Value },
];
const lang2TextResources: ITextResource[] = [
  { id: text1Id, value: text1Lang2Value },
  { id: text2Id, value: text2Lang2Value },
  { id: text3Id, value: text3Lang2Value },
];
const oldData: ITextResources = {
  [language1]: lang1TextResources,
  [language2]: lang2TextResources,
};

// Mocks:
const upsertTextResources = jest
  .fn()
  .mockImplementation((_org, _app, lang) => Promise.resolve(emptyTextResourceListMock(lang)));
jest.mock('react-router-dom', () => jest.requireActual('react-router-dom')); // Todo: Remove this when we have removed the global mock: https://github.com/Altinn/altinn-studio/issues/14597

describe('useUpsertTextResourcesMutation', () => {
  beforeEach(upsertTextResources.mockClear);

  it('Calls upsertTextResources with correct parameters', async () => {
    const payload: ITextResource[] = [{ id: text1Id, value: text1Lang1Value }];
    const args: UpsertTextResourcesMutationArgs = { language: language1, textResources: payload };
    const { result } = renderUpsertTextResourcesMutation();
    await result.current.mutateAsync(args);
    expect(upsertTextResources).toHaveBeenCalledTimes(1);
    expect(upsertTextResources).toHaveBeenCalledWith(org, app, language1, {
      [text1Id]: text1Lang1Value,
    });
  });

  it('Updates the cache optimistically', async () => {
    const queryClient = createQueryClientWithData();
    const setQueryDataSpy = jest.spyOn<QueryClient, 'setQueryData'>(queryClient, 'setQueryData');
    const { result } = renderUpsertTextResourcesMutation(queryClient);
    const newValue = 'Ny verdi';
    const payload: ITextResource[] = [{ id: text1Id, value: newValue }];
    const args: UpsertTextResourcesMutationArgs = { language: language1, textResources: payload };

    await result.current.mutateAsync(args);

    expect(setQueryDataSpy).toHaveBeenCalledTimes(2);
    const expectedData: ITextResources = {
      [language1]: [
        { id: text1Id, value: newValue },
        { id: text2Id, value: text2Lang1Value },
        { id: text3Id, value: text3Lang1Value },
      ],
      [language2]: lang2TextResources,
    };
    const [queryKey, updater] = setQueryDataSpy.mock.calls[0] as [
      TanstackQueryKey,
      (oldData: ITextResources) => ITextResources,
    ];
    expect(queryKey).toEqual(key);
    expect(updater(oldData)).toEqual(expectedData); // We must retrieve the intermediate value this way since in the test, both onMutate and onSuccess callbacks fire during the same iteration of the event loop
  });

  it('Updates the cache with the response on success', async () => {
    const language = 'fr';
    const updatedValueFromBackend: ITextResourcesWithLanguage = { language, resources: [] };
    upsertTextResources.mockResolvedValueOnce(updatedValueFromBackend);
    const queryClient = createQueryClientWithData();
    const { result } = renderUpsertTextResourcesMutation(queryClient);
    const args: UpsertTextResourcesMutationArgs = { language: language1, textResources: [] };

    await result.current.mutateAsync(args);

    const expectedResult: ITextResources = { ...oldData, [language]: [] };
    expect(queryClient.getQueryData(key)).toEqual(expectedResult);
  });

  it('Invalidates the query on error', async () => {
    const queryClient = createQueryClientWithData();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderUpsertTextResourcesMutation(queryClient);
    upsertTextResources.mockRejectedValueOnce(new Error('Test error'));
    const args: UpsertTextResourcesMutationArgs = { language: language1, textResources: [] };

    result.current.mutate(args);

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(invalidateSpy).toHaveBeenCalledTimes(1);
  });
});

function renderUpsertTextResourcesMutation(
  queryClient: QueryClient = createQueryClientMock(),
): RenderHookResult<UseUpsertTextResourceMutationResult, UpsertTextResourcesMutationArgs> {
  return renderHookWithProviders(() => useUpsertTextResourcesMutation(org, app), {
    appRouteParams,
    queries: { upsertTextResources },
    queryClient,
  });
}

function createQueryClientWithData(): QueryClient {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData<ITextResources>([QueryKey.TextResources, org, app], oldData);
  return queryClient;
}
