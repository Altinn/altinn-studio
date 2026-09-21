import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router';

import { NumericInput } from '@app/form-component';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  FocusComponentRequestFromUrl,
  setFocusComponentRequest,
  tryFocusComponent,
  useFocusComponentRequest,
  useHandleFocusComponent,
  withFocusComponentRequestState,
} from 'src/layout/focusComponent';

function useFocusContainerRef(nodeId: string) {
  const ref = useRef<HTMLDivElement | null>(null);
  const handleMount = useHandleFocusComponent(nodeId, ref);
  return useCallback(
    (div: HTMLDivElement | null) => {
      ref.current = div;
      handleMount();
    },
    [handleMount],
  );
}

function FocusTarget({ visible = true, nodeId = 'node-a' }: { visible?: boolean; nodeId?: string }) {
  const focusContainerRef = useFocusContainerRef(nodeId);
  return visible ? (
    <div ref={focusContainerRef}>
      <button data-bindingkey='name'>Button</button>
      <input
        data-bindingkey='name'
        aria-label='Name'
      />
    </div>
  ) : null;
}

describe('focusComponent', () => {
  beforeEach(() => {
    setFocusComponentRequest(undefined);
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    act(() => setFocusComponentRequest(undefined));
    vi.restoreAllMocks();
  });

  it('handles matching requests without re-rendering the target or other components', () => {
    const renders = vi.fn();
    function CountedTarget() {
      renders();
      const focusContainerRef = useFocusContainerRef('node-a');
      return (
        <div ref={focusContainerRef}>
          <input aria-label='Name' />
        </div>
      );
    }
    render(<CountedTarget />);
    const input = screen.getByLabelText('Name');
    const focus = vi.spyOn(input, 'focus');

    act(() => setFocusComponentRequest({ nodeId: 'node-b', errorBinding: null }));
    expect(focus).not.toHaveBeenCalled();
    act(() => setFocusComponentRequest({ nodeId: 'node-a', errorBinding: 'name' }));

    expect(input).toHaveFocus();
    expect(renders).toHaveBeenCalledTimes(1);
    expect(input.parentElement?.scrollIntoView).toHaveBeenCalledTimes(1);
    act(() => setFocusComponentRequest(undefined));
    expect(renders).toHaveBeenCalledTimes(1);
  });

  it('only scans the requested component in a form with many registered targets', () => {
    render(
      <>
        {Array.from({ length: 100 }, (_, i) => (
          <FocusTarget
            key={i}
            nodeId={`node-${i}`}
          />
        ))}
      </>,
    );
    const containers = screen.getAllByLabelText('Name').map((input) => input.parentElement!);
    const scans = containers.map((container) => vi.spyOn(container, 'querySelectorAll'));

    act(() => setFocusComponentRequest({ nodeId: 'node-42', errorBinding: 'name' }));

    expect(containers[42].querySelector('input')).toHaveFocus();
    for (let i = 0; i < scans.length; i++) {
      expect(scans[i]).toHaveBeenCalledTimes(i === 42 ? 1 : 0);
    }
  });

  it('cancels an older pending request when a different available field is focused directly', () => {
    const { rerender } = render(
      <>
        <FocusTarget nodeId='node-b' />
        <FocusTarget
          nodeId='node-a'
          visible={false}
        />
      </>,
    );
    act(() => setFocusComponentRequest({ nodeId: 'node-a', errorBinding: null }));

    act(() => expect(tryFocusComponent({ nodeId: 'node-b', errorBinding: null })).toBe(true));
    expect(screen.getByLabelText('Name')).toHaveFocus();
    rerender(
      <>
        <FocusTarget nodeId='node-b' />
        <FocusTarget nodeId='node-a' />
      </>,
    );

    expect(screen.getAllByLabelText('Name')[0]).toHaveFocus();
    expect(screen.getAllByLabelText('Name')[1]).not.toHaveFocus();
  });

  it('keeps an unsuccessful focus request pending until a usable container mounts', () => {
    function DisabledTarget() {
      const focusContainerRef = useFocusContainerRef('node-a');
      return (
        <div ref={focusContainerRef}>
          <input
            aria-label='Disabled'
            disabled
          />
        </div>
      );
    }
    const { rerender } = render(<DisabledTarget />);
    act(() => setFocusComponentRequest({ nodeId: 'node-a', errorBinding: null }));

    rerender(<FocusTarget />);

    expect(screen.getByLabelText('Name')).toHaveFocus();
  });

  it('returns false when direct focus cannot reach a usable field', () => {
    expect(tryFocusComponent({ nodeId: 'node-a', errorBinding: null })).toBe(false);
  });

  it('notifies revealers while a request is pending and when focus consumes it', () => {
    function Revealer() {
      return <span data-testid='request'>{useFocusComponentRequest()?.nodeId ?? 'none'}</span>;
    }
    const { rerender } = render(<Revealer />);
    act(() => setFocusComponentRequest({ nodeId: 'node-a', errorBinding: null }));
    expect(screen.getByTestId('request')).toHaveTextContent('node-a');

    rerender(
      <>
        <Revealer />
        <FocusTarget />
      </>,
    );

    expect(screen.getByLabelText('Name')).toHaveFocus();
    expect(screen.getByTestId('request')).toHaveTextContent('none');
  });

  it('accepts a focus request in navigation state while keeping the URL clean', () => {
    function Location() {
      return <span data-testid='location'>{useLocation().search}</span>;
    }
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/page',
            search: '?other=keep',
            state: withFocusComponentRequestState(undefined, { nodeId: 'node-a', errorBinding: 'name' }),
          },
        ]}
      >
        <FocusComponentRequestFromUrl />
        <FocusTarget />
        <Location />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText('Name')).toHaveFocus();
    expect(screen.getByTestId('location')).toHaveTextContent('?other=keep');
  });

  it('accepts focus parameters from a direct URL without starting a cleanup navigation', () => {
    function Location() {
      return <span data-testid='location'>{useLocation().search}</span>;
    }
    render(
      <MemoryRouter initialEntries={['/page?other=keep&focusComponentId=node-a&focusErrorBinding=name']}>
        <FocusComponentRequestFromUrl />
        <FocusTarget />
        <Location />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText('Name')).toHaveFocus();
    expect(screen.getByTestId('location')).toHaveTextContent(
      '?other=keep&focusComponentId=node-a&focusErrorBinding=name',
    );
  });

  it('does not clear a newer request when the URL request source unmounts', () => {
    function PendingRequest() {
      return <span data-testid='request'>{useFocusComponentRequest()?.nodeId ?? 'none'}</span>;
    }
    const { rerender } = render(
      <MemoryRouter initialEntries={['/page?focusComponentId=node-a']}>
        <FocusComponentRequestFromUrl />
        <PendingRequest />
      </MemoryRouter>,
    );
    act(() => setFocusComponentRequest({ nodeId: 'node-b', errorBinding: null }));

    rerender(
      <MemoryRouter initialEntries={['/page?focusComponentId=node-a']}>
        <PendingRequest />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('request')).toHaveTextContent('node-b');
  });

  it('handles a repeated navigation to the same field', () => {
    function NavigateAgain() {
      const navigate = useNavigate();
      return <button onClick={() => navigate('/page?focusComponentId=node-a')}>Focus again</button>;
    }
    render(
      <MemoryRouter initialEntries={['/page?focusComponentId=node-a']}>
        <FocusComponentRequestFromUrl />
        <FocusTarget />
        <NavigateAgain />
      </MemoryRouter>,
    );
    const input = screen.getByLabelText('Name');
    expect(input).toHaveFocus();
    const focus = vi.spyOn(input, 'focus');

    act(() => screen.getByRole('button', { name: 'Focus again' }).click());

    expect(focus).toHaveBeenCalledTimes(1);
  });

  it('waits for child initialization when a request arrives before the target mounts', () => {
    const events: string[] = [];
    setFocusComponentRequest({ nodeId: 'node-a', errorBinding: null });
    function Field() {
      useEffect(() => {
        events.push('initialized');
      }, []);
      return (
        <input
          aria-label='Name'
          onFocus={() => events.push('focused')}
        />
      );
    }
    function Target() {
      const focusContainerRef = useFocusContainerRef('node-a');
      return (
        <div ref={focusContainerRef}>
          <Field />
        </div>
      );
    }
    render(<Target />);

    expect(screen.getByLabelText('Name')).toHaveFocus();
    expect(events).toEqual(['initialized', 'focused']);
  });

  it('retries a pending request when an existing component mounts its container, without attachment renders', () => {
    const renders = vi.fn();
    function Target({ visible }: { visible: boolean }) {
      renders();
      const focusContainerRef = useFocusContainerRef('node-a');
      return visible ? (
        <div ref={focusContainerRef}>
          <input aria-label='Name' />
        </div>
      ) : null;
    }
    const { rerender } = render(<Target visible={false} />);
    act(() => setFocusComponentRequest({ nodeId: 'node-a', errorBinding: null }));
    expect(renders).toHaveBeenCalledTimes(1);

    rerender(<Target visible />);

    expect(screen.getByLabelText('Name')).toHaveFocus();
    expect(renders).toHaveBeenCalledTimes(2);
  });

  it('can type into a numeric field revealed for a pending request', async () => {
    const user = userEvent.setup();
    function Target({ visible }: { visible: boolean }) {
      const focusContainerRef = useFocusContainerRef('node-a');
      const [value, setValue] = useState('');
      return visible ? (
        <div ref={focusContainerRef}>
          <NumericInput
            aria-label='Amount'
            prefix='NOK '
            thousandSeparator=' '
            value={value}
            onValueChange={(values) => setValue(values.value)}
          />
        </div>
      ) : null;
    }
    const { rerender } = render(<Target visible={false} />);
    act(() => setFocusComponentRequest({ nodeId: 'node-a', errorBinding: null }));
    rerender(<Target visible />);
    const input = screen.getByRole('textbox', { name: 'Amount' });
    expect(input).toHaveFocus();

    await user.type(input, '123');

    expect(input).toHaveValue('NOK 123');
  });

  it('does not replay a handled request on re-render or container replacement', () => {
    const { rerender } = render(<FocusTarget />);
    act(() => setFocusComponentRequest({ nodeId: 'node-a', errorBinding: null }));
    const focus = vi.spyOn(screen.getByLabelText('Name'), 'focus');

    rerender(<FocusTarget />);
    expect(focus).not.toHaveBeenCalled();
    rerender(<FocusTarget visible={false} />);
    rerender(<FocusTarget />);
    expect(screen.getByLabelText('Name')).not.toHaveFocus();
  });

  it('handles a new request for the same field', () => {
    render(<FocusTarget />);
    const focus = vi.spyOn(screen.getByLabelText('Name'), 'focus');
    act(() => setFocusComponentRequest({ nodeId: 'node-a', errorBinding: null }));
    act(() => setFocusComponentRequest({ nodeId: 'node-a', errorBinding: null }));
    expect(focus).toHaveBeenCalledTimes(2);
  });

  it('unsubscribes when the target unmounts', () => {
    const { unmount } = render(<FocusTarget />);
    const focus = vi.spyOn(screen.getByLabelText('Name'), 'focus');
    unmount();
    act(() => setFocusComponentRequest({ nodeId: 'node-a', errorBinding: null }));
    expect(focus).not.toHaveBeenCalled();
  });

  it('survives StrictMode subscription setup and cleanup without repeating focus', () => {
    setFocusComponentRequest({ nodeId: 'node-a', errorBinding: null });
    render(
      <React.StrictMode>
        <FocusTarget />
      </React.StrictMode>,
    );
    expect(screen.getByLabelText('Name')).toHaveFocus();
  });
});
