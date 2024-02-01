import { queriesMock } from '../../mocks/queriesMock';
import { useTextResourcesQuery } from './useTextResourcesQuery';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { ServicesContextProvider } from '../../contexts/ServicesContext';
import { createQueryClientMock } from '../../mocks/queryClientMock';

// Test data:
const org = 'org';
const app = 'app';
const languagesMock = ['nb', 'nn', 'en'];

describe('useTextResourcesQuery', () => {
  it('Calls getTextResources for each language', async () => {
    const getTextLanguages = jest.fn().mockImplementation(() => Promise.resolve(languagesMock));
    const client = createQueryClientMock();
    const { result: resourcesResult } = renderHook(() => useTextResourcesQuery(org, app), {
      wrapper: ({ children }) => (
        <ServicesContextProvider
          {...queriesMock}
          getTextLanguages={getTextLanguages}
          client={client}
        >
          {children}
        </ServicesContextProvider>
      ),
    });
    await waitFor(() => expect(resourcesResult.current.isSuccess).toBe(true));
    expect(getTextLanguages).toHaveBeenCalledTimes(1);
    expect(getTextLanguages).toHaveBeenCalledWith(org, app);
    expect(queriesMock.getTextResources).toHaveBeenCalledTimes(languagesMock.length);
    languagesMock.forEach((language) => {
      expect(queriesMock.getTextResources).toHaveBeenCalledWith(org, app, language);
    });
  });
});
