import React from 'react';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { useUpsertTextResourceMutation } from './useUpsertTextResourceMutation';
import type { UpsertTextResourceMutation } from 'app-shared/hooks/mutations/useUpsertTextResourceMutation';
import { renderHook } from '@testing-library/react';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { ServicesContextProvider } from '../../contexts/ServicesContext';

// Test data:
const org = 'org';
const app = 'app';
const language = 'nb';
const textId = 'testid';
const translation = 'testvalue';
const args: UpsertTextResourceMutation = { textId, language, translation };

describe('useUpsertTextResourceMutation', () => {
  test('Calls upsertTextResources with correct parameters', async () => {
    const { result: renderUpsertTextResourcesMutationResult } = renderUpsertTextResourceMutation();
    await renderUpsertTextResourcesMutationResult.current.mutateAsync(args);
    expect(queriesMock.upsertTextResources).toHaveBeenCalledTimes(1);
    expect(queriesMock.upsertTextResources).toHaveBeenCalledWith(org, app, language, {
      [textId]: translation,
    });
  });
});

const renderUpsertTextResourceMutation = () => {
  const client = createQueryClientMock();
  return renderHook(() => useUpsertTextResourceMutation(org, app), {
    wrapper: ({ children }) => (
      <ServicesContextProvider {...queriesMock} client={client}>
        {children}
      </ServicesContextProvider>
    ),
  });
};
