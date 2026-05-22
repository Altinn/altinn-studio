import { org, app } from '@studio/testing/testids';
import { renderHookWithProviders } from '../../testing/mocks';
import { waitFor } from '@testing-library/react';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { useSaveGlobalValidationOnNavigation } from './useSaveGlobalValidationOnNavigation';
import type { IValidationOnNavigationLayoutSets } from 'app-shared/types/global';

describe('useSaveGlobalValidationOnNavigation', () => {
  it('Calls saveValidationOnNavigationLayoutSets with correct arguments and payload', async () => {
    const { result } = saveGlobalValidationOnNavigation();
    const payload: IValidationOnNavigationLayoutSets = {
      show: ['type1', 'type2'],
      page: 'page1',
    };

    result.current.mutate(payload);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queriesMock.updateValidationOnNavigationLayoutSets).toHaveBeenCalledTimes(1);
    expect(queriesMock.updateValidationOnNavigationLayoutSets).toHaveBeenCalledWith(
      org,
      app,
      payload,
    );
  });
});

const saveGlobalValidationOnNavigation = () => {
  return renderHookWithProviders(() => useSaveGlobalValidationOnNavigation(org, app));
};
