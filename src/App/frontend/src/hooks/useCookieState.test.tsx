import React from 'react';

import { act, renderHook, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { getProfileMock } from 'src/__mocks__/getProfileMock';
import { useCookieState } from 'src/hooks/useCookieState';
import { renderWithMinimalProviders } from 'src/test/renderWithProviders';
import { CookieStorage } from 'src/utils/cookieStorage/CookieStorage';

describe('useCookieState', () => {
  beforeEach(() => {
    // Clear all cookies before each test
    document.cookie.split(';').forEach((cookie) => {
      const name = cookie.split('=')[0].trim();
      document.cookie = `${name}=; max-age=0; path=/${window.org}/${window.app}`;
    });

    // Set default profile
    window.altinnAppGlobalData.userProfile = getProfileMock();
  });

  afterEach(() => {
    window.altinnAppGlobalData.userProfile = getProfileMock();
  });

  it('should return the default value when no cookie exists', () => {
    const { result } = renderHook(() => useCookieState('lang', null));
    expect(result.current[0]).toBeNull();
  });

  it('should return the cookie value when it exists', () => {
    CookieStorage.setItem('lang_12345', 'nb');
    const { result } = renderHook(() => useCookieState('lang', null));
    expect(result.current[0]).toBe('nb');
  });

  it('should update the cookie when setValue is called', () => {
    const { result } = renderHook(() => useCookieState<string | null>('lang', null));

    act(() => {
      result.current[1]('en');
    });

    expect(result.current[0]).toBe('en');
    expect(CookieStorage.getItem('lang_12345')).toBe('en');
  });

  it('should remove the cookie when setValue is called with null', () => {
    CookieStorage.setItem('lang_12345', 'nb');
    const { result } = renderHook(() => useCookieState('lang', null));

    expect(result.current[0]).toBe('nb');

    act(() => {
      result.current[1](null);
    });

    expect(result.current[0]).toBeNull();
    expect(CookieStorage.getItem('lang_12345')).toBeNull();
  });

  it('should use the correct key format with org, app, and partyId', () => {
    const { result } = renderHook(() => useCookieState<string | null>('lang', null));

    act(() => {
      result.current[1]('nn');
    });

    // Verify the cookie is stored with the correct key including partyId
    expect(CookieStorage.getItem('lang_12345')).toBe('nn');
    expect(CookieStorage.getItem('lang')).toBeNull();
  });

  it('should work without partyId when profile is not loaded', () => {
    window.altinnAppGlobalData.userProfile = undefined;

    const { result } = renderHook(() => useCookieState<string | null>('lang', null));

    act(() => {
      result.current[1]('en');
    });

    // Without partyId, the key should be lang
    expect(CookieStorage.getItem('lang')).toBe('en');
  });

  describe('component integration', () => {
    function TestComponent() {
      const [language, setLanguage] = useCookieState('lang', 'nb');

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
