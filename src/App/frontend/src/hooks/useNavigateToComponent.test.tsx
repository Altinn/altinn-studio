import React, { useCallback, useRef } from 'react';

import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { defaultDataTypeMock } from 'src/__mocks__/getUiConfigMock';
import { LinkToPotentialNode } from 'src/components/form/LinkToPotentialNode';
import { useExitSubform, useNavigatePage, useNavigateToComponent } from 'src/hooks/useNavigatePage';
import {
  FocusComponentRequestFromUrl,
  setFocusComponentRequest,
  useFocusComponentRequest,
  useHandleFocusComponent,
} from 'src/layout/focusComponent';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';

async function setup({ available = true, query = 'other=keep' }: { available?: boolean; query?: string } = {}) {
  const renders = vi.fn();
  function Target() {
    renders();
    const ref = useRef<HTMLDivElement | null>(null);
    const handleMount = useHandleFocusComponent('target', ref);
    const containerRef = useCallback(
      (div: HTMLDivElement | null) => {
        ref.current = div;
        handleMount();
      },
      [handleMount],
    );
    return (
      <div ref={containerRef}>
        <input aria-label='Name' />
      </div>
    );
  }
  function Caller() {
    const navigate = useNavigateToComponent();
    return <button onClick={() => navigate('target', 'target', undefined)}>Focus name</button>;
  }
  function PageCaller() {
    const { navigateToPage } = useNavigatePage();
    return (
      <button
        onClick={() =>
          navigateToPage('FormLayout', {
            focusComponentRequest: { nodeId: 'target', errorBinding: null },
          })
        }
      >
        Navigate and focus
      </button>
    );
  }
  function PendingRequest() {
    return <span data-testid='pending-request'>{useFocusComponentRequest()?.nodeId ?? 'none'}</span>;
  }
  const result = await renderWithInstanceAndLayout({
    renderer: (
      <>
        <Caller />
        <PageCaller />
        <LinkToPotentialNode to='?other=keep&focusComponentId=target'>Focus name link</LinkToPotentialNode>
        {available && <Target />}
        <PendingRequest />
        <FocusComponentRequestFromUrl />
      </>
    ),
    query,
    queries: {
      fetchFormBootstrapForInstance: async () =>
        getFormBootstrapMock((obj) => {
          obj.layouts = {
            FormLayout: {
              data: {
                layout: [
                  {
                    id: 'target',
                    type: 'Input',
                    dataModelBindings: { simpleBinding: { dataType: defaultDataTypeMock, field: 'name' } },
                  },
                ],
              },
            },
          };
        }),
    },
  });
  return { ...result, renders };
}

describe('useNavigateToComponent', () => {
  beforeEach(() => {
    setFocusComponentRequest(undefined);
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => act(() => setFocusComponentRequest(undefined)));

  it('focuses an available field repeatedly without navigation or target re-renders', async () => {
    const user = userEvent.setup();
    const { routerRef, renders } = await setup();
    const originalLocation = routerRef.current?.state.location;
    const originalRenders = renders.mock.calls.length;
    const input = screen.getByRole('textbox', { name: 'Name' });
    const focus = vi.spyOn(input, 'focus');

    await user.click(screen.getByRole('button', { name: 'Focus name' }));
    await user.click(screen.getByRole('button', { name: 'Focus name' }));

    expect(input).toHaveFocus();
    expect(focus).toHaveBeenCalledTimes(2);
    expect(routerRef.current?.state.location).toBe(originalLocation);
    expect(renders).toHaveBeenCalledTimes(originalRenders);
  });

  it('keeps a request pending without navigating when a same-page field is not available', async () => {
    const user = userEvent.setup();
    const { routerRef } = await setup({ available: false, query: 'other=keep&focusErrorBinding=old' });
    const originalLocation = routerRef.current?.state.location;

    await user.click(screen.getByRole('button', { name: 'Focus name' }));

    await waitFor(() => expect(screen.getByTestId('pending-request')).toHaveTextContent('target'));
    expect(routerRef.current?.state.location).toBe(originalLocation);
  });

  it('keeps focus parameters in a component link while using clean navigation for an ordinary click', async () => {
    const user = userEvent.setup();
    const { routerRef } = await setup();
    const link = screen.getByRole('link', { name: 'Focus name link' });
    const input = screen.getByRole('textbox', { name: 'Name' });

    expect(link).toHaveAttribute('href', expect.stringContaining('focusComponentId=target'));
    await user.click(link);

    await waitFor(() => expect(input).toHaveFocus());
    expect(routerRef.current?.state.location.search).toBe('?other=keep');
  });

  it('preserves the focus request when navigation also prevents focus and scroll reset', async () => {
    const user = userEvent.setup();
    const { routerRef } = await setup();
    const input = screen.getByRole('textbox', { name: 'Name' });

    await user.click(screen.getByRole('button', { name: 'Navigate and focus' }));

    await waitFor(() => expect(input).toHaveFocus());
    expect(routerRef.current?.state.location.state).toEqual({
      preventFocusReset: true,
      focusComponentRequest: { nodeId: 'target', errorBinding: null },
    });
  });

  it('returns from a subform with a clean URL and focuses its component through navigation state', async () => {
    const user = userEvent.setup();
    function ExitSubform() {
      const exitSubform = useExitSubform();
      return <button onClick={() => exitSubform()}>Exit subform</button>;
    }
    function Target() {
      const ref = useRef<HTMLDivElement | null>(null);
      const handleMount = useHandleFocusComponent('target', ref);
      const containerRef = useCallback(
        (div: HTMLDivElement | null) => {
          ref.current = div;
          handleMount();
        },
        [handleMount],
      );
      return (
        <div ref={containerRef}>
          <input aria-label='Target field' />
        </div>
      );
    }
    const { routerRef } = await renderWithInstanceAndLayout({
      renderer: (
        <>
          <ExitSubform />
          <Target />
          <FocusComponentRequestFromUrl />
        </>
      ),
      initialPath:
        '/ttd/test/instance/512345/75154373-aed4-41f7-95b4-e5b5115c2edc/Task_1/FormLayout/target/data-element/SubformPage',
      alwaysRouteToChildren: true,
    });

    await user.click(screen.getByRole('button', { name: 'Exit subform' }));

    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Target field' })).toHaveFocus());
    expect(routerRef.current?.state.location.pathname).toBe(
      '/ttd/test/instance/512345/75154373-aed4-41f7-95b4-e5b5115c2edc/Task_1/FormLayout',
    );
    expect(routerRef.current?.state.location.search).toBe('');
    expect(routerRef.current?.state.location.state).toEqual({
      preventFocusReset: true,
      focusComponentRequest: { nodeId: 'target', errorBinding: null },
    });
  });
});
