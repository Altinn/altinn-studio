import { waitFor } from '@testing-library/react';
import { queriesMock, renderHookWithMockStore } from '../../testing/mocks';
import { useFrontEndSettingsQuery } from './useFrontEndSettingsQuery';

// Test data:
const org = 'org';
const app = 'app';

describe('useFrontEndSettingsQuery', () => {
  it('calls getFrontEndSettings with the correct parameters', () => {
    render();
    expect(queriesMock.getFrontEndSettings).toHaveBeenCalledWith('org', 'app');
  });
});

const render = async () => {
  const { renderHookResult } = renderHookWithMockStore()(() => useFrontEndSettingsQuery(org, app));
  await waitFor(() => expect(renderHookResult.result.current.isSuccess).toBe(true));
  return renderHookResult;
};
