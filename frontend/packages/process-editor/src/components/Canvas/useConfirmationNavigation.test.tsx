import React from 'react';
import { act, render as rtlRender } from '@testing-library/react';
import { useConfirmNavigation } from './useConfirmNavigation';
import { RouterProvider, createMemoryRouter, useBeforeUnload } from 'react-router-dom';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useBeforeUnload: jest.fn(),
}));

const confirmationMessage = 'test';

const Component = ({ hasUnsavedChanges }: { hasUnsavedChanges: boolean }) => {
  useConfirmNavigation(hasUnsavedChanges, confirmationMessage);
  return null;
};

const render = (hasUnsavedChanges: boolean) => {
  const router = createMemoryRouter([
    {
      path: '/',
      element: <Component hasUnsavedChanges={hasUnsavedChanges} />,
    },
    {
      path: '/test',
      element: null,
    },
  ]);

  const { rerender } = rtlRender(<RouterProvider router={router}></RouterProvider>);
  return {
    rerender,
    router,
  };
};

describe('usePreventNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call useBeforeUnload with the expected arguments', () => {
    const hasUnsavedChanges = true;
    render(hasUnsavedChanges);

    expect(useBeforeUnload).toHaveBeenCalledWith(expect.any(Function), {
      capture: true,
    });
  });

  it('should prevent navigation if hasUnsavedChanges is true', () => {
    const event = {
      type: 'beforeunload',
      returnValue: confirmationMessage,
    } as BeforeUnloadEvent;
    event.preventDefault = jest.fn();

    const hasUnsavedChanges = true;
    render(hasUnsavedChanges);

    const callbackFn = (useBeforeUnload as jest.MockedFunction<typeof useBeforeUnload>).mock
      .calls[0][0];
    callbackFn(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.returnValue).toBe(confirmationMessage);
  });

  it('should not prevent navigation if hasUnsavedChanges is false', () => {
    const event = {
      type: 'beforeunload',
      returnValue: '',
    } as BeforeUnloadEvent;
    event.preventDefault = jest.fn();

    const hasUnsavedChanges = false;
    render(hasUnsavedChanges);

    const callbackFn = (useBeforeUnload as jest.MockedFunction<typeof useBeforeUnload>).mock
      .calls[0][0];
    callbackFn(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(event.returnValue).toBe('');
  });

  it('doesnt show confirmation dialog when there are no unsaved changes', async () => {
    window.confirm = jest.fn();

    const hasUnsavedChanges = false;
    const { router } = render(hasUnsavedChanges);

    await act(async () => {
      await router.navigate('/test');
    });

    expect(window.confirm).toHaveBeenCalledTimes(0);
    expect(router.state.location.pathname).toBe('/test');
  });

  it('show confirmation dialog when there are unsaved changes', async () => {
    window.confirm = jest.fn();

    const hasUnsavedChanges = true;
    const { router } = render(hasUnsavedChanges);

    await act(async () => {
      await router.navigate('/test');
    });

    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(router.state.location.pathname).toBe('/');
  });

  it('cancel redirection when clicking cancel', async () => {
    window.confirm = jest.fn(() => false);

    const hasUnsavedChanges = true;
    const { router } = render(hasUnsavedChanges);

    await act(async () => {
      await router.navigate('/test');
    });

    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(router.state.location.pathname).toBe('/');
  });

  it('redirect when clicking OK', async () => {
    window.confirm = jest.fn(() => true);

    const hasUnsavedChanges = true;
    const { router } = render(hasUnsavedChanges);

    await act(async () => {
      await router.navigate('/test');
    });

    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(router.state.location.pathname).toBe('/test');
  });
});
