import { app, org } from '@studio/testing/testids';
import { queriesMock } from '../../mocks/queriesMock';
import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';
import {
  type UpdateOptionListMutationArgs,
  useUpdateOptionListMutation,
} from './useUpdateOptionListMutation';
import type { Option } from '../../types/Option';
import { createQueryClientMock } from '../../mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';

// Test data:
const optionsListId = 'test';
const option1: Option = { value: 'test', label: 'test' };
const optionsList: Option[] = [option1];
const updatedOptionsList: Option[] = [{ ...option1, description: 'description' }];
const args: UpdateOptionListMutationArgs = { optionListId: optionsListId, optionsList };
const updateOptionList = jest.fn().mockImplementation(() => Promise.resolve(updatedOptionsList));

describe('useUpdateOptionListMutation', () => {
  test('Calls useUpdateOptionList with correct parameters', async () => {
    const renderUpdateOptionsListMutationResult = renderHookWithProviders(() =>
      useUpdateOptionListMutation(org, app),
    ).result;
    await renderUpdateOptionsListMutationResult.current.mutateAsync(args);
    expect(queriesMock.updateOptionList).toHaveBeenCalledTimes(1);
    expect(queriesMock.updateOptionList).toHaveBeenCalledWith(org, app, optionsListId, optionsList);
  });

  test('Sets the updated options list on the cache for all options lists when cache contains the list', async () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData(
      [QueryKey.OptionLists, org, app],
      [{ title: optionsListId, data: optionsList }],
    );
    const renderUpdateOptionsListMutationResult = renderHookWithProviders(
      () => useUpdateOptionListMutation(org, app),
      { queries: { updateOptionList }, queryClient },
    ).result;
    await renderUpdateOptionsListMutationResult.current.mutateAsync(args);
    expect(queryClient.getQueryData([QueryKey.OptionLists, org, app])).toEqual([
      {
        title: optionsListId,
        data: updatedOptionsList,
      },
    ]);
  });

  test('Adds the new options list on the cache for all options lists when cache does not contain the list', async () => {
    const queryClient = createQueryClientMock();
    const existingOptionsList = { title: 'some-other-options-list-id', data: optionsList };
    queryClient.setQueryData([QueryKey.OptionLists, org, app], [existingOptionsList]);
    const renderUpdateOptionsListMutationResult = renderHookWithProviders(
      () => useUpdateOptionListMutation(org, app),
      { queries: { updateOptionList }, queryClient },
    ).result;
    await renderUpdateOptionsListMutationResult.current.mutateAsync(args);
    expect(queryClient.getQueryData([QueryKey.OptionLists, org, app])).toEqual([
      {
        title: optionsListId,
        data: updatedOptionsList,
      },
      existingOptionsList,
    ]);
  });

  test('Sets the updated options list on the cache for the single options list', async () => {
    const queryClient = createQueryClientMock();
    const renderUpdateOptionsListMutationResult = renderHookWithProviders(
      () => useUpdateOptionListMutation(org, app),
      { queries: { updateOptionList }, queryClient },
    ).result;
    await renderUpdateOptionsListMutationResult.current.mutateAsync(args);
    expect(queryClient.getQueryData([QueryKey.OptionList, org, app, optionsListId])).toEqual(
      updatedOptionsList,
    );
  });
});
