import React from 'react';

import { act, renderHook, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { useCookieState } from 'src/hooks/useCookieState';
import { renderWithMinimalProviders } from 'src/test/renderWithProviders';
import { CookieStorage } from 'src/utils/cookieStorage/CookieStorage';

// Mock window.org and window.app
beforeAll(() => {
  Object.defineProperty(window, 'org', { value: 'testorg', writable: true });
  Object.defineProperty(window, 'app', { value: 'testapp', writable: true });
});

describe('useCookieState', () => {
  beforeEach(() => {
    // Clear all cookies before each test
    document.cookie.split(';').forEach((cookie) => {
      const name = cookie.split('=')[0].trim();
      document.cookie = `${name}=; max-age=0; path=/`;
    });
  });

  it('should return the default value when no cookie exists', () => {
    const { result } = renderHook(() => useCookieState(['lang'], null));
    expect(result.current[0]).toBeNull();
  });

  it('should return the cookie value when it exists', () => {
    CookieStorage.setItem('testorg_testapp_lang', 'nb');
    const { result } = renderHook(() => useCookieState(['lang'], null));
    expect(result.current[0]).toBe('nb');
  });

  it('should update the cookie when setValue is called', () => {
    const { result } = renderHook(() => useCookieState<string | null>(['lang'], null));

    act(() => {
      result.current[1]('en');
    });

    expect(result.current[0]).toBe('en');
    expect(CookieStorage.getItem('testorg_testapp_lang')).toBe('en');
  });

  it('should remove the cookie when setValue is called with null', () => {
    CookieStorage.setItem('testorg_testapp_lang', 'nb');
    const { result } = renderHook(() => useCookieState(['lang'], null));

    expect(result.current[0]).toBe('nb');

    act(() => {
      result.current[1](null);
    });

    expect(result.current[0]).toBeNull();
    expect(CookieStorage.getItem('testorg_testapp_lang')).toBeNull();
  });

  it('should use the correct key format with org and app', () => {
    const { result } = renderHook(() => useCookieState<string | null>(['lang'], null));

    act(() => {
      result.current[1]('nn');
    });

    // Verify the cookie is stored with the correct key
    expect(CookieStorage.getItem('testorg_testapp_lang')).toBe('nn');
    expect(CookieStorage.getItem('lang')).toBeNull();
  });

  describe('with scope keys', () => {
    it('should include scope keys in the cookie key', () => {
      const { result } = renderHook(() => useCookieState<string | null>(['lang', 12345], null));

      act(() => {
        result.current[1]('en');
      });

      expect(CookieStorage.getItem('testorg_testapp_lang_12345')).toBe('en');
    });

    it('should filter out null and undefined scope keys', () => {
      const { result } = renderHook(() => useCookieState<string | null>(['lang', null, undefined, 'validKey'], null));

      act(() => {
        result.current[1]('en');
      });

      expect(CookieStorage.getItem('testorg_testapp_lang_validKey')).toBe('en');
    });

    it('should filter out empty string scope keys', () => {
      const { result } = renderHook(() => useCookieState<string | null>(['lang', '', 'validKey'], null));

      act(() => {
        result.current[1]('en');
      });

      expect(CookieStorage.getItem('testorg_testapp_lang_validKey')).toBe('en');
    });
  });

  describe('component integration', () => {
    function TestComponent() {
      const [language, setLanguage] = useCookieState(['lang'], 'nb');

      return (
        <>
          <div data-testid='language'>{language}</div>
          <button onClick={() => setLanguage('en')}>Set English</button>
          <button onClick={() => setLanguage('nn')}>Set Nynorsk</button>
        </>
      );
    }

    it('should update the UI when the cookie value changes', async () => {
      await renderWithMinimalProviders({
        renderer: () => <TestComponent />,
      });

      expect(screen.getByTestId('language')).toHaveTextContent('nb');

      await userEvent.click(screen.getByText('Set English'));
      expect(screen.getByTestId('language')).toHaveTextContent('en');

      await userEvent.click(screen.getByText('Set Nynorsk'));
      expect(screen.getByTestId('language')).toHaveTextContent('nn');
    });

    it('should persist the value across re-renders', async () => {
      const { rerender } = await renderWithMinimalProviders({
        renderer: () => <TestComponent />,
      });

      await userEvent.click(screen.getByText('Set English'));
      expect(screen.getByTestId('language')).toHaveTextContent('en');

      // Re-render the component
      rerender(<TestComponent />);

      // Value should still be 'en' from the cookie
      expect(screen.getByTestId('language')).toHaveTextContent('en');
    });
  });
});
