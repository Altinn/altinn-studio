import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';
import { ValidationOnNavigationLevel } from 'app-shared/types/global';
import { useValidationOnNavigationQuery } from './useValidationOnNavigationQuery';
import { app, org } from '@studio/testing/testids';
import { waitFor } from '@testing-library/react';

describe('useValidationOnNavigationQuery', () => {
  it('should call getValidationOnNavigation with the correct parameters', async () => {
    await renderHook();
    expect(queriesMock.getValidationOnNavigation).toHaveBeenCalledWith(
      org,
      app,
      ValidationOnNavigationLevel.Global,
    );
  });

  it('should call getValidationOnNavigation with the correct parameters for Pages level', async () => {
    await renderHook(ValidationOnNavigationLevel.Pages);
    expect(queriesMock.getValidationOnNavigation).toHaveBeenCalledWith(
      org,
      app,
      ValidationOnNavigationLevel.Pages,
    );
  });

  it('should call getValidationOnNavigation with the correct parameters for LayoutSets level', async () => {
    await renderHook(ValidationOnNavigationLevel.LayoutSets);
    expect(queriesMock.getValidationOnNavigation).toHaveBeenCalledWith(
      org,
      app,
      ValidationOnNavigationLevel.LayoutSets,
    );
  });
});

const renderHook = async (level?: ValidationOnNavigationLevel) => {
  const { result } = renderHookWithProviders(() => useValidationOnNavigationQuery(org, app, level));
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  return result;
};
