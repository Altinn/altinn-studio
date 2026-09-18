import React, { useCallback, useRef } from 'react';

import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { defaultDataTypeMock } from 'src/__mocks__/getUiConfigMock';
import { useNavigateToComponent } from 'src/hooks/useNavigatePage';
import {
  FocusComponentRequestFromUrl,
  setFocusComponentRequest,
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
  const result = await renderWithInstanceAndLayout({
    renderer: (
      <>
        <Caller />
        {available && <Target />}
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

  it('keeps URL navigation as the fallback for a field that is not available', async () => {
    const user = userEvent.setup();
    const { routerRef } = await setup({ available: false, query: 'other=keep&focusErrorBinding=old' });

    await user.click(screen.getByRole('button', { name: 'Focus name' }));

    await waitFor(() => {
      const params = new URLSearchParams(routerRef.current?.state.location.search);
      expect(params.get('focusComponentId')).toBe('target');
      expect(params.get('other')).toBe('keep');
      expect(params.get('focusErrorBinding')).toBeNull();
    });
  });
});
