import { queriesMock } from 'app-shared/mocks/queriesMock';
import { app, org } from '@studio/testing/testids';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';
import { useOptionListQuery } from 'app-shared/hooks/queries/useOptionListQuery';
import { waitFor } from '@testing-library/react';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { OptionList } from 'app-shared/types/OptionList';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

const optionsListId = 'optionsListId';

describe('useOptionListQuery', () => {
  it('calls getOptionList with the correct parameters', () => {
    render();
    expect(queriesMock.getOptionList).toHaveBeenCalledWith(org, app, optionsListId);
  });

  it('getOptionList returns optionList as is', async () => {
    const optionsList: OptionList = [{ value: 'value', label: 'label' }];
    const getOptionList = jest.fn().mockImplementation(() => Promise.resolve(optionsList));
    const { current: currentResult } = await render({ getOptionList });
    expect(currentResult.data).toBe(optionsList);
  });
});

const render = async (queries: Partial<ServicesContextProps> = {}) => {
  const queryClient = createQueryClientMock();
  const { result } = renderHookWithProviders(() => useOptionListQuery(org, app, optionsListId), {
    queries,
    queryClient,
  });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  return result;
};
