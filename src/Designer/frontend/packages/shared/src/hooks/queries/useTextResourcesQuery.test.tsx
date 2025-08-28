import { queriesMock } from '../../mocks/queriesMock';
import { useTextResourcesQuery } from './useTextResourcesQuery';
import { waitFor } from '@testing-library/react';
import { app, org } from '@studio/testing/testids';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';

// Test data:
const languagesMock = ['nb', 'nn', 'en'];

describe('useTextResourcesQuery', () => {
  it('Calls getTextResources for each language', async () => {
    const getTextLanguages = jest.fn().mockImplementation(() => Promise.resolve(languagesMock));
    const result = renderHookWithProviders(() => useTextResourcesQuery(org, app), {
      queries: { getTextLanguages },
    }).result;
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getTextLanguages).toHaveBeenCalledTimes(1);
    expect(getTextLanguages).toHaveBeenCalledWith(org, app);
    expect(queriesMock.getTextResources).toHaveBeenCalledTimes(languagesMock.length);
    languagesMock.forEach((language) => {
      expect(queriesMock.getTextResources).toHaveBeenCalledWith(org, app, language);
    });
  });
});
