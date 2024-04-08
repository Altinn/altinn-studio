import { waitFor } from '@testing-library/react';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from '../../testing/mocks';
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
  const { result } = renderHookWithProviders(() => useFrontEndSettingsQuery(org, app));
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  return result;
};
