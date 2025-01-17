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
const optionListId = 'test';
const option1: Option = { value: 'test', label: 'test' };
const optionList: Option[] = [option1];
const updatedOptionsList: Option[] = [{ ...option1, description: 'description' }];
const args: UpdateOptionListMutationArgs = { optionListId, optionList };
const updateOptionList = jest.fn().mockImplementation(() => Promise.resolve(updatedOptionsList));

describe('useUpdateOptionListMutation', () => {
  test('Calls useUpdateOptionList with correct parameters', async () => {
    const renderUpdateOptionsListMutationResult = renderHookWithProviders(() =>
      useUpdateOptionListMutation(org, app),
    ).result;
    await renderUpdateOptionsListMutationResult.current.mutateAsync(args);
    expect(queriesMock.updateOptionList).toHaveBeenCalledTimes(1);
    expect(queriesMock.updateOptionList).toHaveBeenCalledWith(org, app, optionListId, optionList);
  });

  test('Sets the updated option list on the cache for all options lists when cache contains the list', async () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData(
      [QueryKey.OptionLists, org, app],
      [{ title: optionListId, data: optionList }],
    );
    const renderUpdateOptionsListMutationResult = renderHookWithProviders(
      () => useUpdateOptionListMutation(org, app),
      { queries: { updateOptionList }, queryClient },
    ).result;
    await renderUpdateOptionsListMutationResult.current.mutateAsync(args);
    expect(queryClient.getQueryData([QueryKey.OptionLists, org, app])).toEqual([
      {
        title: optionListId,
        data: updatedOptionsList,
      },
    ]);
  });

  test('Adds the new option list on the cache for all options lists when cache does not contain the list', async () => {
    const queryClient = createQueryClientMock();
    const existingOptionsList = { title: 'some-other-options-list-id', data: optionList };
    queryClient.setQueryData([QueryKey.OptionLists, org, app], [existingOptionsList]);
    const renderUpdateOptionsListMutationResult = renderHookWithProviders(
      () => useUpdateOptionListMutation(org, app),
      { queries: { updateOptionList }, queryClient },
    ).result;
    await renderUpdateOptionsListMutationResult.current.mutateAsync(args);
    expect(queryClient.getQueryData([QueryKey.OptionLists, org, app])).toEqual([
      {
        title: optionListId,
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
    expect(queryClient.getQueryData([QueryKey.OptionList, org, app, optionListId])).toEqual(
      updatedOptionsList,
    );
  });
});
