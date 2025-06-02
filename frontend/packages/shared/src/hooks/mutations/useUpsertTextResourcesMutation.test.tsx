import type { UpsertTextResourcesMutationArgs } from './useUpsertTextResourcesMutation';
import { useUpsertTextResourcesMutation } from './useUpsertTextResourcesMutation';
import type { ITextResource } from 'app-shared/types/global';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';
import type { AppRouteParams } from '../../types/AppRouteParams';
import { emptyTextResourceListMock } from '../../mocks/emptyTextResourceListMock';

// Test data:
const org = 'organisation';
const app = 'application';
const appRouteParams: AppRouteParams = { org, app };
const language = 'nb';
const textId = 'testid';
const textValue = 'testvalue';
const textResources: ITextResource[] = [{ id: textId, value: textValue }];
const args: UpsertTextResourcesMutationArgs = { language, textResources };

// Mocks:
const upsertTextResources = jest
  .fn()
  .mockImplementation((_org, _app, lang) => Promise.resolve(emptyTextResourceListMock(lang)));
jest.mock('react-router-dom', () => jest.requireActual('react-router-dom')); // Todo: Remove this when we have removed the global mock: https://github.com/Altinn/altinn-studio/issues/14597

describe('useUpsertTextResourcesMutation', () => {
  beforeEach(upsertTextResources.mockClear);

  it('Calls upsertTextResources with correct parameters', async () => {
    const { result } = renderHookWithProviders(() => useUpsertTextResourcesMutation(org, app), {
      appRouteParams,
      queries: { upsertTextResources },
    });
    await result.current.mutateAsync(args);
    expect(upsertTextResources).toHaveBeenCalledTimes(1);
    expect(upsertTextResources).toHaveBeenCalledWith(org, app, language, {
      [textId]: textValue,
    });
  });
});
