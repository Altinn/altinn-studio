import { useTextResourceValue } from './useTextResourceValue';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import { renderHookWithProviders } from '../../../testing/mocks';

// Test data
const id = 'testId';
const value = 'testValue';
const language = 'nb';

// Mocks
const textResourcesMock = { [language]: [{ id, value }] };

describe('useTextResourceValue', () => {
  it('should return the text resource value', () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.TextResources, org, app], textResourcesMock);
    queryClient.setQueryData([QueryKey.TextLanguages, org, app], [language]);
    const { result } = renderHookWithProviders(() => useTextResourceValue(id), { queryClient });
    expect(result.current).toEqual(value);
  });
});
