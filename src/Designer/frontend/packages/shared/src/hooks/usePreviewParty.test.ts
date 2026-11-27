import { afterEach, describe, expect, it } from 'vitest';
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
});
