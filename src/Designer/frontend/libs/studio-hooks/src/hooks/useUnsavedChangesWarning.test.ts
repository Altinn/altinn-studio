import { renderHook } from '@testing-library/react';
import * as reactRouterDom from 'react-router-dom';
import { useUnsavedChangesWarning } from './useUnsavedChangesWarning';

jest.mock('react-router-dom', () => ({
  useBeforeUnload: jest.fn(),
  useBlocker: jest.fn(),
}));

const message = 'You have unsaved changes';

describe('useUnsavedChangesWarning', () => {
  let capturedBeforeUnloadHandler: (event: BeforeUnloadEvent) => void;
  let mockUseBlocker: jest.Mock;

  beforeEach(() => {
    jest.mocked(reactRouterDom.useBeforeUnload).mockImplementation((handler) => {
      capturedBeforeUnloadHandler = handler as (event: BeforeUnloadEvent) => void;
    });
    mockUseBlocker = jest.mocked(reactRouterDom.useBlocker);
    mockUseBlocker.mockReturnValue({ state: 'idle' });
  });

  afterEach(() => jest.resetAllMocks());

  describe('beforeunload', () => {
    it('prevents the event when there are unsaved changes', () => {
      renderHook(() => useUnsavedChangesWarning(true, message));
      const event = new Event('beforeunload') as BeforeUnloadEvent;
      jest.spyOn(event, 'preventDefault');
      capturedBeforeUnloadHandler(event);
      expect(event.preventDefault).toHaveBeenCalledTimes(1);
    });

    it('does not prevent the event when there are no unsaved changes', () => {
      renderHook(() => useUnsavedChangesWarning(false, message));
      const event = new Event('beforeunload') as BeforeUnloadEvent;
      jest.spyOn(event, 'preventDefault');
      capturedBeforeUnloadHandler(event);
      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('in-app navigation blocker', () => {
    it('calls proceed when blocker is blocked and user confirms', () => {
      jest.spyOn(window, 'confirm').mockReturnValue(true);
      const blocker = { state: 'blocked', proceed: jest.fn(), reset: jest.fn() };
      mockUseBlocker.mockReturnValue(blocker);
      renderHook(() => useUnsavedChangesWarning(true, message));
      expect(window.confirm).toHaveBeenCalledWith(message);
      expect(blocker.proceed).toHaveBeenCalledTimes(1);
      expect(blocker.reset).not.toHaveBeenCalled();
    });

    it('calls reset when blocker is blocked and user cancels', () => {
      jest.spyOn(window, 'confirm').mockReturnValue(false);
      const blocker = { state: 'blocked', proceed: jest.fn(), reset: jest.fn() };
      mockUseBlocker.mockReturnValue(blocker);
      renderHook(() => useUnsavedChangesWarning(true, message));
      expect(window.confirm).toHaveBeenCalledWith(message);
      expect(blocker.reset).toHaveBeenCalledTimes(1);
      expect(blocker.proceed).not.toHaveBeenCalled();
    });

    it('does not prompt when blocker is idle', () => {
      jest.spyOn(window, 'confirm');
      mockUseBlocker.mockReturnValue({ state: 'idle' });
      renderHook(() => useUnsavedChangesWarning(true, message));
      expect(window.confirm).not.toHaveBeenCalled();
    });
  });
});
