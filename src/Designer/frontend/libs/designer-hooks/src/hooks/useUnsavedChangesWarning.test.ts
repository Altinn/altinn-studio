import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { renderHook } from '@testing-library/react';
import * as reactRouterDom from 'react-router-dom';
import { useUnsavedChangesWarning } from './useUnsavedChangesWarning';

vi.mock('react-router-dom', () => ({
  useBeforeUnload: vi.fn(),
  useBlocker: vi.fn(),
}));

const message = 'You have unsaved changes';

describe('useUnsavedChangesWarning', () => {
  let capturedBeforeUnloadHandler: (event: BeforeUnloadEvent) => void;
  let mockUseBlocker: Mock;

  beforeEach(() => {
    vi.mocked(reactRouterDom.useBeforeUnload).mockImplementation((handler) => {
      capturedBeforeUnloadHandler = handler as (event: BeforeUnloadEvent) => void;
    });
    mockUseBlocker = vi.mocked(reactRouterDom.useBlocker);
    mockUseBlocker.mockReturnValue({ state: 'idle' });
  });

  afterEach(() => vi.resetAllMocks());

  describe('beforeunload', () => {
    it('prevents the event when there are unsaved changes', () => {
      renderHook(() => useUnsavedChangesWarning(true, message));
      const event = new Event('beforeunload') as BeforeUnloadEvent;
      vi.spyOn(event, 'preventDefault');
      capturedBeforeUnloadHandler(event);
      expect(event.preventDefault).toHaveBeenCalledTimes(1);
    });

    it('does not prevent the event when there are no unsaved changes', () => {
      renderHook(() => useUnsavedChangesWarning(false, message));
      const event = new Event('beforeunload') as BeforeUnloadEvent;
      vi.spyOn(event, 'preventDefault');
      capturedBeforeUnloadHandler(event);
      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('in-app navigation blocker', () => {
    it('calls proceed when blocker is blocked and user confirms', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const blocker = { state: 'blocked', proceed: vi.fn(), reset: vi.fn() };
      mockUseBlocker.mockReturnValue(blocker);
      renderHook(() => useUnsavedChangesWarning(true, message));
      expect(window.confirm).toHaveBeenCalledWith(message);
      expect(blocker.proceed).toHaveBeenCalledTimes(1);
      expect(blocker.reset).not.toHaveBeenCalled();
    });

    it('calls reset when blocker is blocked and user cancels', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      const blocker = { state: 'blocked', proceed: vi.fn(), reset: vi.fn() };
      mockUseBlocker.mockReturnValue(blocker);
      renderHook(() => useUnsavedChangesWarning(true, message));
      expect(window.confirm).toHaveBeenCalledWith(message);
      expect(blocker.reset).toHaveBeenCalledTimes(1);
      expect(blocker.proceed).not.toHaveBeenCalled();
    });

    it('does not prompt when blocker is idle', () => {
      vi.spyOn(window, 'confirm');
      mockUseBlocker.mockReturnValue({ state: 'idle' });
      renderHook(() => useUnsavedChangesWarning(true, message));
      expect(window.confirm).not.toHaveBeenCalled();
    });
  });
});
