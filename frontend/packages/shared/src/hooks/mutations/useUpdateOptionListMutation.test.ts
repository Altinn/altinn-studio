import { app, org } from '@studio/testing/testids';
import { queriesMock } from '../../mocks/queriesMock';
import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';
import {
  type UpdateOptionListMutationArgs,
  useUpdateOptionListMutation,
} from './useUpdateOptionListMutation';
<<<<<<< HEAD
import type { Option } from '../../types/Option';
import { createQueryClientMock } from '../../mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';

// Test data:
const optionListId = 'test';
const option1: Option = { value: 'test', label: 'test' };
const optionsList: Option[] = [option1];
const updatedOptionsList: Option[] = [{ ...option1, description: 'description' }];
const args: UpdateOptionListMutationArgs = { optionListId, optionsList };
const updateOptionList = jest.fn().mockImplementation(() => Promise.resolve(updatedOptionsList));
=======
import type { Option } from 'app-shared/types/Option';
import { updateOptionListResponse } from 'app-shared/mocks/mocks';
import { QueryKey } from 'app-shared/types/QueryKey';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

// Test data:
const optionListId = 'test';
const optionsList: Option[] = [{ value: 'test', label: 'test' }];
const args: UpdateOptionListMutationArgs = { optionListId, optionsList };
>>>>>>> 6771ccf44 (Ensure code lists are always alphabetically ordered)

describe('useUpdateOptionListMutation', () => {
  test('Calls useUpdateOptionList with correct parameters', async () => {
    const renderUpdateOptionListMutationResult = renderHookWithProviders(() =>
      useUpdateOptionListMutation(org, app),
    ).result;
    await renderUpdateOptionListMutationResult.current.mutateAsync(args);
    expect(queriesMock.updateOptionList).toHaveBeenCalledTimes(1);
    expect(queriesMock.updateOptionList).toHaveBeenCalledWith(org, app, optionListId, optionsList);
  });

  test('Sets the updated option list on the cache', async () => {
    const queryClient = createQueryClientMock();
    const renderUpdateOptionListMutationResult = renderHookWithProviders(
      () => useUpdateOptionListMutation(org, app),
<<<<<<< HEAD
      { queries: { updateOptionList }, queryClient },
    ).result;
    await renderUpdateOptionListMutationResult.current.mutateAsync(args);
    expect(queryClient.getQueryData([QueryKey.OptionLists, org, app])).toEqual({
      test: updatedOptionsList,
=======
      { queryClient },
    ).result;
    await renderUpdateOptionListMutationResult.current.mutateAsync(args);
    expect(queryClient.getQueryData([QueryKey.OptionLists, org, app])).toEqual({
      test: updateOptionListResponse,
>>>>>>> 6771ccf44 (Ensure code lists are always alphabetically ordered)
    });
  });
});
