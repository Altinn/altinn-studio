import React, { useEffect, useRef } from 'react';
import { createBrowserRouter, createMemoryRouter, MemoryRouter, useNavigate } from 'react-router';
import { RouterProvider } from 'react-router/dom';

import { act, render, screen, waitFor } from '@testing-library/react';

import {
  type FocusComponentRequest,
  FocusComponentRequestFromUrl,
  setFocusComponentRequest,
  setFocusComponentUrlCleanup,
  useFocusComponentRequest,
  useHandleFocusComponent,
} from 'src/layout/focusComponent';

describe('focusComponent', () => {
  function SimpleFocusTarget() {
    const ref = useRef<HTMLDivElement | null>(null);
    useHandleFocusComponent('node-a', ref);
    return (
      <div ref={ref}>
        <input aria-label='Name' />
      </div>
    );
  }
  function focusRoutes(extra?: React.ReactNode) {
    return [
      {
        path: '*',
        element: (
          <>
            <FocusComponentRequestFromUrl />
            <SimpleFocusTarget />
            {extra}
          </>
        ),
      },
    ];
  }
  function createFocusRouter(extra?: React.ReactNode) {
    return createMemoryRouter(focusRoutes(extra), { initialEntries: ['/form?focusComponentId=node-a'] });
  }

  beforeEach(() => {
    setFocusComponentRequest(undefined);
    setFocusComponentUrlCleanup(undefined);
    HTMLElement.prototype.scrollIntoView = jest.fn();
    window.requestAnimationFrame = (callback) => {
      callback(0);
      return 0;
    };
  });

  afterEach(() => {
    act(() => setFocusComponentRequest(undefined));
    setFocusComponentUrlCleanup(undefined);
    window.history.replaceState({}, '', '/');
    jest.restoreAllMocks();
  });

  it('does not re-render a subscriber when a focus request targets another component', () => {
    const renderRequests: (FocusComponentRequest | undefined)[] = [];

    function FocusRequestConsumer() {
      const request = useFocusComponentRequest('node-a');
      renderRequests.push(request);
      return <span>{request?.nodeId ?? 'none'}</span>;
    }

    render(<FocusRequestConsumer />);
    expect(renderRequests).toHaveLength(1);

    act(() => setFocusComponentRequest({ nodeId: 'node-b', errorBinding: null }));

    expect(renderRequests).toHaveLength(1);
    expect(screen.getByText('none')).toBeInTheDocument();
  });

  it('re-renders when the focus request targets the subscriber', () => {
    const renderRequests: (FocusComponentRequest | undefined)[] = [];

    function FocusRequestConsumer() {
      const request = useFocusComponentRequest('node-a');
      renderRequests.push(request);
      return <span>{request?.errorBinding ?? 'none'}</span>;
    }

    render(<FocusRequestConsumer />);
    act(() => setFocusComponentRequest({ nodeId: 'node-a', errorBinding: 'name' }));

    expect(renderRequests).toHaveLength(2);
    expect(screen.getByText('name')).toBeInTheDocument();
  });

  it('publishes focus requests from URL parameters', async () => {
    function FocusRequestConsumer() {
      const request = useFocusComponentRequest('node-a');
      return <span>{request?.errorBinding ?? 'none'}</span>;
    }

    render(
      <MemoryRouter initialEntries={['/page?focusComponentId=node-a&focusErrorBinding=name']}>
        <FocusComponentRequestFromUrl />
        <FocusRequestConsumer />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText('name')).toBeInTheDocument());
  });

  it('focuses the requested component and cleans focus URL parameters', async () => {
    const cleanup = jest.fn();
    setFocusComponentUrlCleanup(cleanup);

    function FocusTarget() {
      const ref = useRef<HTMLDivElement | null>(null);
      useHandleFocusComponent('node-a', ref);
      return (
        <div ref={ref}>
          <button data-bindingkey='name'>Button</button>
          <input
            data-bindingkey='name'
            aria-label='Name'
          />
        </div>
      );
    }

    render(<FocusTarget />);
    act(() => setFocusComponentRequest({ nodeId: 'node-a', errorBinding: 'name' }));

    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveFocus());
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('keeps focus URL parameters until the requested component mounts', async () => {
    const cleanup = jest.fn();
    setFocusComponentUrlCleanup(cleanup);
    act(() => setFocusComponentRequest({ nodeId: 'node-a', errorBinding: null }));

    expect(cleanup).not.toHaveBeenCalled();

    render(<SimpleFocusTarget />);

    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveFocus());
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('does not let focus URL cleanup overwrite immediate page navigation', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();

    function NavigateWhenFocused() {
      const request = useFocusComponentRequest('node-a');
      const navigate = useNavigate();
      useEffect(() => {
        if (request) {
          navigate('/summary');
        }
      }, [navigate, request]);
      return null;
    }

    window.history.replaceState({}, '', '/form?focusComponentId=node-a');
    const router = createBrowserRouter(focusRoutes(<NavigateWhenFocused />));

    render(<RouterProvider router={router} />);

    await waitFor(() => expect(router.state.location.pathname).toBe('/summary'));
    expect(window.location.pathname).toBe('/summary');
    expect(router.state.location.search).toBe('');
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('cleans focus URL parameters synchronously after focusing', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    const router = createFocusRouter();
    const navigate = jest.spyOn(router, 'navigate');

    render(<RouterProvider router={router} />);

    await waitFor(() => expect(router.state.location.search).toBe(''));
    expect(router.state.location.pathname).toBe('/form');
    expect(navigate).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ flushSync: true }));
    expect(consoleError).not.toHaveBeenCalled();
  });
});
