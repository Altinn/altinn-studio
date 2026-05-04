import { renderHook } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { useEnvironmentTitle } from './useEnvironmentTitle';

describe('useEnvironmentTitle', () => {
  it('returns lowercase production environment title for "production"', () => {
    const { result } = renderHook(() => useEnvironmentTitle('production'));

    expect(result.current).toBe(textMock('general.production_environment_alt').toLowerCase());
  });

  it('returns test environment title with uppercase env name for non-production', () => {
    const { result } = renderHook(() => useEnvironmentTitle('tt02'));

    expect(result.current).toBe(`${textMock('general.test_environment_alt').toLowerCase()} TT02`);
  });

  it('returns test environment title with uppercase env name for at-environments', () => {
    const { result } = renderHook(() => useEnvironmentTitle('at22'));

    expect(result.current).toBe(`${textMock('general.test_environment_alt').toLowerCase()} AT22`);
  });
});
