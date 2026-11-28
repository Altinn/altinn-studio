import { describe, expect, it } from 'vitest';
import { useSearchParams } from 'react-router-dom';
import { renderHookWithProviders } from './mocks';

describe('renderHookWithProviders', () => {
  it('starts the router with the supplied query parameters', () => {
    const { result } = renderHookWithProviders(() => useSearchParams()[0], {
      search: '?component=Input&layout=Side1',
    });

    expect(result.current.get('component')).toBe('Input');
    expect(result.current.get('layout')).toBe('Side1');
  });
});
