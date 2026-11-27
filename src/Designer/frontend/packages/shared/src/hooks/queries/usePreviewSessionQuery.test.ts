import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';
import { usePreviewSessionQuery } from './usePreviewSessionQuery';
import { app, org } from '@designer/testing/testids';

const firstSessionUrl = 'https://preview.example/first/';
const secondSessionUrl = 'https://preview.example/second/';
const minutes = (count: number): number => count * 60 * 1000;

const setVisibility = (visibilityState: DocumentVisibilityState): void => {
  Object.defineProperty(document, 'visibilityState', {
    value: visibilityState,
    configurable: true,
  });
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
};

const renderSessionQuery = () => {
  const startPreviewSession = vi
    .fn()
    .mockResolvedValueOnce({ url: firstSessionUrl })
    .mockResolvedValueOnce({ url: secondSessionUrl });
  const { result } = renderHookWithProviders(() => usePreviewSessionQuery(org, app), {
    queries: { startPreviewSession },
  });
  return { result, startPreviewSession };
};

describe('usePreviewSessionQuery', () => {
  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  });

  it('starts a new session when the page shows again after being hidden for longer than the session may last', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const { result, startPreviewSession } = renderSessionQuery();
    await waitFor(() => expect(result.current.data?.url).toBe(firstSessionUrl));

    setVisibility('hidden');
    vi.setSystemTime(Date.now() + minutes(21));
    setVisibility('visible');

    await waitFor(() => expect(result.current.data?.url).toBe(secondSessionUrl));
    expect(startPreviewSession).toHaveBeenCalledTimes(2);
  });

  it('keeps the session when the page was hidden for a shorter time', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const { result, startPreviewSession } = renderSessionQuery();
    await waitFor(() => expect(result.current.data?.url).toBe(firstSessionUrl));

    setVisibility('hidden');
    vi.setSystemTime(Date.now() + minutes(19));
    setVisibility('visible');

    expect(result.current.data?.url).toBe(firstSessionUrl);
    expect(startPreviewSession).toHaveBeenCalledTimes(1);
  });
});
