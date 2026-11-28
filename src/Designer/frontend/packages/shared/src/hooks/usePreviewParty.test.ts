import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '../mocks/renderHookWithProviders';
import { usePreviewParty } from './usePreviewParty';

describe('usePreviewParty', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('acts for the person until the developer chooses otherwise', () => {
    const { result } = renderHookWithProviders(() => usePreviewParty());

    expect(result.current.party).toBe('person');
  });

  it('acts for the party the developer chose in this browser before', () => {
    localStorage.setItem('previewParty', '"organization"');

    const { result } = renderHookWithProviders(() => usePreviewParty());

    expect(result.current.party).toBe('organization');
  });

  it('acts for the person when the browser has kept something else', () => {
    localStorage.setItem('previewParty', '"bankruptcyEstate"');

    const { result } = renderHookWithProviders(() => usePreviewParty());

    expect(result.current.party).toBe('person');
  });

  it('keeps the choice for this browser', async () => {
    const { result } = renderHookWithProviders(() => usePreviewParty());

    act(() => result.current.setParty('organization'));

    await waitFor(() => expect(result.current.party).toBe('organization'));
    expect(localStorage.getItem('previewParty')).toBe('"organization"');
  });

  it('uses the choice on this page when the browser cannot store it', async () => {
    const { result } = renderHookWithProviders(() => usePreviewParty());
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Full', 'QuotaExceededError');
    });

    act(() => {
      expect(() => result.current.setParty('organization')).toThrow();
    });

    await waitFor(() => expect(result.current.party).toBe('organization'));
    vi.restoreAllMocks();
  });
});
