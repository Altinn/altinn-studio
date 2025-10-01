import { jest } from '@jest/globals';

export const mockMediaQuery = (maxWidth: number) => {
  const setScreenWidth = (width: number) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });
    window.matchMedia = jest.fn(
      (query: string) =>
        ({
          matches: width <= maxWidth,
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        }) as unknown as MediaQueryList,
    );
  };

  return { setScreenWidth };
};
