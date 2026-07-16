import React, { useRef } from 'react';
import { MemoryRouter } from 'react-router';

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

    function FocusTarget() {
      const ref = useRef<HTMLDivElement | null>(null);
      useHandleFocusComponent('node-a', ref);
      return (
        <div ref={ref}>
          <input aria-label='Name' />
        </div>
      );
    }

    render(<FocusTarget />);

    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveFocus());
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});
