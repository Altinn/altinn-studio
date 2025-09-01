import { waitFor } from '@testing-library/react';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithMockStore } from '../../testing/mocks';
import { useFrontEndSettingsQuery } from './useFrontEndSettingsQuery';
import { app, org } from '@studio/testing/testids';

describe('useFrontEndSettingsQuery', () => {
  it('calls getFrontEndSettings with the correct parameters', () => {
    render();
    expect(queriesMock.getFrontEndSettings).toHaveBeenCalledWith(org, app);
  });
});

const render = async () => {
  const { renderHookResult } = renderHookWithMockStore()(() => useFrontEndSettingsQuery(org, app));
  await waitFor(() => expect(renderHookResult.result.current.isSuccess).toBe(true));
  return renderHookResult;
};
