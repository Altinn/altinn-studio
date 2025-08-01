import { renderHook } from '@testing-library/react';
import { useMediaQuery } from './useMediaQuery';
import MockedFunction = jest.MockedFunction;

// Test data:
const query = '(min-width: 600px)';

describe('useMediaQuery', () => {
  afterEach(() => jest.resetAllMocks());

  it.each([true, false])('Returns value from window.matchMedia.matches when it is %s', (value) => {
    const matchMedia = mockMatchMediaApi({ matches: value });
    const { result } = renderHook(() => useMediaQuery(query));
    expect(matchMedia).toHaveBeenCalledWith(query);
    expect(result.current).toBe(value);
  });

  it('Adds event listener', () => {
    const addEventListener = jest.fn();
    mockMatchMediaApi({ addEventListener });
    renderHook(() => useMediaQuery(query));
    expect(addEventListener).toHaveBeenCalledTimes(1);
  });

  it('Removes the event listener on unmount', () => {
    const removeEventListener = jest.fn();
    mockMatchMediaApi({ removeEventListener });
    const { unmount } = renderHook(() => useMediaQuery(query));
    expect(removeEventListener).not.toHaveBeenCalled();
    unmount();
    expect(removeEventListener).toHaveBeenCalledTimes(1);
  });
});

type MatchMediaMockOptions = {
  matches?: boolean;
  addEventListener?: jest.Mock;
  removeEventListener?: jest.Mock;
};

function mockMatchMediaApi(
  options: MatchMediaMockOptions,
): MockedFunction<typeof window.matchMedia> {
  const matchMediaMock = createMatchMediaMock(options);
  Object.defineProperty(window, 'matchMedia', { writable: true, value: matchMediaMock });
  return matchMediaMock;
}

function createMatchMediaMock({
  matches = false,
  addEventListener = jest.fn(),
  removeEventListener = jest.fn(),
}): MockedFunction<typeof window.matchMedia> {
  return jest.fn().mockImplementation((query) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener,
    removeEventListener,
    dispatchEvent: jest.fn(),
  }));
}
