import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHook } from '@testing-library/react';
import type { UpsertTextResourcesMutationArgs } from './useUpsertTextResourcesMutation';
import { useUpsertTextResourcesMutation } from './useUpsertTextResourcesMutation';
import type { ITextResource } from 'app-shared/types/global';
import { createQueryClientMock } from '../../mocks/queryClientMock';
import React from 'react';
import { ServicesContextProvider } from '../../contexts/ServicesContext';

// Test data:
const org = 'org';
const app = 'app';
const language = 'nb';
const textId = 'testid';
const textValue = 'testvalue';
const textResources: ITextResource[] = [{ id: textId, value: textValue }];
const args: UpsertTextResourcesMutationArgs = { language, textResources };

describe('useUpsertTextResourcesMutation', () => {
  test('Calls upsertTextResources with correct parameters', async () => {
    const { result: upsertTextResources } = renderUpsertTextResourcesMutation();
    await upsertTextResources.current.mutateAsync(args);
    expect(queriesMock.upsertTextResources).toHaveBeenCalledTimes(1);
    expect(queriesMock.upsertTextResources).toHaveBeenCalledWith(org, app, language, {
      [textId]: textValue,
    });
  });
});

const renderUpsertTextResourcesMutation = () => {
  const client = createQueryClientMock();
  return renderHook(() => useUpsertTextResourcesMutation(org, app), {
    wrapper: ({ children }) => (
      <ServicesContextProvider {...queriesMock} client={client}>
        {children}
      </ServicesContextProvider>
    ),
  });
};
