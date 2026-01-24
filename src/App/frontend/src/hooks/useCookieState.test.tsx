import React from 'react';

import { jest } from '@jest/globals';
import { act, renderHook, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { useProfileQuery } from 'src/features/profile/ProfileProvider';
import { useCookieState } from 'src/hooks/useCookieState';
import { renderWithMinimalProviders } from 'src/test/renderWithProviders';
import { CookieStorage } from 'src/utils/cookieStorage/CookieStorage';

jest.mock('src/features/profile/ProfileProvider', () => ({
  useProfileQuery: jest.fn(),
}));

const mockedUseProfileQuery = jest.mocked(useProfileQuery);

describe('useCookieState', () => {
  beforeEach(() => {
    // Clear all cookies before each test
    document.cookie.split(';').forEach((cookie) => {
      const name = cookie.split('=')[0].trim();
      document.cookie = `${name}=; max-age=0; path=/${window.org}/${window.app}`;
    });

    // Default mock for useProfileQuery
    mockedUseProfileQuery.mockReturnValue({
      data: { partyId: 12345 },
      isLoading: false,
      enabled: true,
    } as ReturnType<typeof useProfileQuery>);
  });

  it('should return the default value when no cookie exists', () => {
    const { result } = renderHook(() => useCookieState('lang', null));
    expect(result.current[0]).toBeNull();
  });

  it('should return the cookie value when it exists', () => {
    CookieStorage.setItem('ttd_test_12345_lang', 'nb');
    const { result } = renderHook(() => useCookieState('lang', null));
    expect(result.current[0]).toBe('nb');
  });

  it('should update the cookie when setValue is called', () => {
    const { result } = renderHook(() => useCookieState<string | null>('lang', null));

    act(() => {
      result.current[1]('en');
    });

    expect(result.current[0]).toBe('en');
    expect(CookieStorage.getItem('ttd_test_12345_lang')).toBe('en');
  });

  it('should remove the cookie when setValue is called with null', () => {
    CookieStorage.setItem('ttd_test_12345_lang', 'nb');
    const { result } = renderHook(() => useCookieState('lang', null));

    expect(result.current[0]).toBe('nb');

    act(() => {
      result.current[1](null);
    });

    expect(result.current[0]).toBeNull();
    expect(CookieStorage.getItem('ttd_test_12345_lang')).toBeNull();
  });

  it('should use the correct key format with org, app, and partyId', () => {
    const { result } = renderHook(() => useCookieState<string | null>('lang', null));

    act(() => {
      result.current[1]('nn');
    });

    // Verify the cookie is stored with the correct key including partyId
    expect(CookieStorage.getItem('ttd_test_12345_lang')).toBe('nn');
    expect(CookieStorage.getItem('lang')).toBeNull();
  });

  it('should work without partyId when profile is not loaded', () => {
    mockedUseProfileQuery.mockReturnValue({
      data: null,
      isLoading: true,
      enabled: true,
    } as ReturnType<typeof useProfileQuery>);

    const { result } = renderHook(() => useCookieState<string | null>('lang', null));

    act(() => {
      result.current[1]('en');
    });

    // Without partyId, the key should be org_app_lang
    expect(CookieStorage.getItem('ttd_test_lang')).toBe('en');
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
