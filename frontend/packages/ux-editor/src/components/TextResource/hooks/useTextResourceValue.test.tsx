import { useTextResourceValue } from './useTextResourceValue';
import { textResourceByLanguageAndIdSelector } from '@altinn/ux-editor/selectors/textResourceSelectors';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { renderHook } from '@testing-library/react';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import React from 'react';
import { queriesMock } from 'app-shared/mocks/queriesMock';

// Test data
const id = 'testId';
const value = 'testValue';

// Mocks
jest.mock('@altinn/ux-editor/hooks', () => ({
  useTextResourcesSelector: jest.fn((selector) => ({
    value: selector === textResourceByLanguageAndIdSelector(DEFAULT_LANGUAGE, id) ? value : value,
  })),
}));

const renderUseTextResourceValue = () => {
  const client = createQueryClientMock();
  return renderHook(() => useTextResourceValue(id), {
    wrapper: ({ children }) => (
      <ServicesContextProvider {...queriesMock} client={client}>
        {children}
      </ServicesContextProvider>
    ),
  });
};

describe('useTextResourceValue', () => {
  it('should return the text resource value', () => {
    const { result } = renderUseTextResourceValue();
    expect(result.current).toEqual(value);
  });
});
