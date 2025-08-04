import { renderHook, act } from '@testing-library/react';
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

  it('Returns false when window.matchMedia.matches is undefined', () => {
    const matchMedia = mockMatchMediaApi({ matches: undefined });
    const { result } = renderHook(() => useMediaQuery(query));
    expect(matchMedia).toHaveBeenCalledWith(query);
    expect(result.current).toBe(false);
  });

  it('Adds event listener', () => {
    const addEventListener = jest.fn();
    mockMatchMediaApi({ matches: false, addEventListener });
    renderHook(() => useMediaQuery(query));
    expect(addEventListener).toHaveBeenCalledTimes(1);
  });

  it('Should update return value when change handler is called with updated value', () => {
    const addEventListener = jest.fn();
    mockMatchMediaApi({ matches: false, addEventListener });
    const { result } = renderHook(() => useMediaQuery(query));

    expect(result.current).toBe(false);

    const eventHandler = getChangeEventHandlerFromMock(addEventListener);
    const changeEvent: Partial<MediaQueryListEvent> = {
      matches: true,
      media: query,
    };

    act(() => {
      eventHandler(changeEvent);
    });

    expect(result.current).toBe(true);
  });

  it('Removes the event listener on unmount', () => {
    const removeEventListener = jest.fn();
    mockMatchMediaApi({ matches: false, removeEventListener });
    const { unmount } = renderHook(() => useMediaQuery(query));
    expect(removeEventListener).not.toHaveBeenCalled();
    unmount();
    expect(removeEventListener).toHaveBeenCalledTimes(1);
  });
});

type MatchMediaMockOptions = {
  matches: boolean | undefined;
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
  matches,
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

function getChangeEventHandlerFromMock(
  addEventListenerMock: jest.Mock,
): (event: Partial<MediaQueryListEvent>) => void {
  // `addEventListener` is called with ('change', eventHandler).
  // The eventHandler is the second argument of the first call.
  return addEventListenerMock.mock.calls[0][1];
}
