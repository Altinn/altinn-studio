import { renderHook } from '@testing-library/react';
import { useEnvironmentTitle } from './useEnvironmentTitle';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'general.production_environment_alt': 'Production Environment',
        'general.test_environment_alt': 'Test Environment',
      };
      return translations[key] ?? key;
    },
  }),
}));

describe('useEnvironmentTitle', () => {
  it('returns lowercase production environment title for "production"', () => {
    const { result } = renderHook(() => useEnvironmentTitle('production'));

    expect(result.current).toBe('production environment');
  });

  it('returns test environment title with uppercase env name for non-production', () => {
    const { result } = renderHook(() => useEnvironmentTitle('tt02'));

    expect(result.current).toBe('test environment TT02');
  });

  it('returns test environment title with uppercase env name for at-environments', () => {
    const { result } = renderHook(() => useEnvironmentTitle('at22'));

    expect(result.current).toBe('test environment AT22');
  });
});
