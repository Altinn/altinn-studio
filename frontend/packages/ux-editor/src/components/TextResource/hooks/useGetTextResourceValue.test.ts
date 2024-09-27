import { useGetTextResourceValue } from './useGetTextResourceValue';
import { textResourceByLanguageAndIdSelector } from '@altinn/ux-editor/selectors/textResourceSelectors';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { renderHook } from '@testing-library/react';
import { type ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { type ReactNode } from 'react';

// Test data
const id = 'testId';
const value = 'testValue';

// Mocks
jest.mock('@altinn/ux-editor/hooks', () => ({
  useTextResourcesSelector: jest.fn((selector) => ({
    value: selector === textResourceByLanguageAndIdSelector(DEFAULT_LANGUAGE, id) ? value : value,
  })),
}));

const renderuseGetTextResourceValue = (props = {}) => {
  const allProps = {
    id,
    ...props,
  };

  return renderHook(() => useGetTextResourceValue(allProps.id), {
    wrapper: ({ children }) =>
      ServicesContextProvider
        ? ServicesContextProvider({ children } as unknown as ServicesContextProps)
        : (children as ReactNode),
  });
};

describe('useGetTextResourceValue', () => {
  it('should return the text resource value', () => {
    const { result } = renderuseGetTextResourceValue();
    expect(result.current).toEqual(value);
  });
});
