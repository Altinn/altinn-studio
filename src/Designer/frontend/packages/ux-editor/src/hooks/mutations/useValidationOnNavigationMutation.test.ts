import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';
import { ValidationOnNavigationLevel } from 'app-shared/types/global';
import { useValidationOnNavigationMutation } from './useValidationOnNavigationMutation';
import type { ExternalConfigState } from '../../components/Settings/SettingsNavigation/ValidateNavigation/utils/ValidateNavigationTypes';
import { app, org } from '@studio/testing/testids';
import { waitFor } from '@testing-library/react';

describe('useSaveValidationOnNavigation', () => {
  it('calls updateValidationOnNavigation with the global level and config', async () => {
    const config: ExternalConfigState = { show: ['All'], page: 'current' };
    await renderAndMutate(ValidationOnNavigationLevel.Global, config);
    expect(queriesMock.updateValidationOnNavigation).toHaveBeenCalledWith(
      org,
      app,
      ValidationOnNavigationLevel.Global,
      config,
    );
  });

  it('calls updateValidationOnNavigation with the layout sets level and array', async () => {
    const config: ExternalConfigState[] = [{ show: ['All'], page: 'current', tasks: ['set1'] }];
    await renderAndMutate(ValidationOnNavigationLevel.LayoutSets, config);
    expect(queriesMock.updateValidationOnNavigation).toHaveBeenCalledWith(
      org,
      app,
      ValidationOnNavigationLevel.LayoutSets,
      config,
    );
  });

  it('calls updateValidationOnNavigation with the pages level and array', async () => {
    const config: ExternalConfigState[] = [
      { show: ['All'], page: 'current', task: 'set1', pages: ['page1'] },
    ];
    await renderAndMutate(ValidationOnNavigationLevel.Pages, config);
    expect(queriesMock.updateValidationOnNavigation).toHaveBeenCalledWith(
      org,
      app,
      ValidationOnNavigationLevel.Pages,
      config,
    );
  });
});

const renderAndMutate = async (
  level: ValidationOnNavigationLevel,
  config: ExternalConfigState | ExternalConfigState[],
) => {
  const { result } = renderHookWithProviders(() =>
    useValidationOnNavigationMutation(org, app, level),
  );
  result.current.mutate(config);
  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  return result;
};
