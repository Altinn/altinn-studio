import { queriesMock } from 'app-shared/mocks/queriesMock';
import type { UpsertTextResourcesMutationArgs } from './useUpsertTextResourcesMutation';
import { useUpsertTextResourcesMutation } from './useUpsertTextResourcesMutation';
import type { ITextResource } from 'app-shared/types/global';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';
import { AppRouteParams } from 'app-shared/types/AppRouteParams';
import { RenderHookResult } from '@testing-library/react';
import {
  UpdateOrgTextResourcesMutationArgs,
  UseUpdateOrgTextResourcesMutationResult,
} from './useUpdateOrgTextResourcesMutation';
import { QueryClient } from '@tanstack/react-query';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

// Test data:
const language = 'nb';
const textId = 'testid';
const textValue = 'testvalue';
const textResources: ITextResource[] = [{ id: textId, value: textValue }];
const args: UpsertTextResourcesMutationArgs = { language, textResources };
const org = 'organisation';
const app = 'application';
const appRouteParams: AppRouteParams = { org, app };

// Mocks:
jest.mock('react-router-dom', () => jest.requireActual('react-router-dom')); // Todo: Remove this when we have removed the global mock: https://github.com/Altinn/altinn-studio/issues/14597

describe('useUpsertTextResourcesMutation', () => {
  test('Calls upsertTextResources with correct parameters', async () => {
    const { result } = renderUpsertTextResourcesMutation();
    await result.current.mutateAsync(args);
    expect(queriesMock.upsertTextResources).toHaveBeenCalledTimes(1);
    expect(queriesMock.upsertTextResources).toHaveBeenCalledWith(org, app, language, {
      [textId]: textValue,
    });
  });
});

function renderUpsertTextResourcesMutation(
  queryClient: QueryClient = createQueryClientMock(),
): RenderHookResult<UseUpdateOrgTextResourcesMutationResult, UpdateOrgTextResourcesMutationArgs> {
  return renderHookWithProviders(() => useUpsertTextResourcesMutation(org, app), {
    appRouteParams,
    queryClient,
  });
}
