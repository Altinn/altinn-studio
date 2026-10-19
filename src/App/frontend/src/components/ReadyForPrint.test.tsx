import React from 'react';

import { act, render, waitFor } from '@testing-library/react';

import { ReadyForPrint } from 'src/components/ReadyForPrint';

const query = vi.hoisted(() => ({ fetching: 0, listeners: new Set<() => void>() }));
vi.mock('src/core/queries/reactQuery', () => {
  const client = {
    isFetching: () => query.fetching,
    getQueryCache: () => ({
      subscribe: (listener: () => void) => {
        query.listeners.add(listener);
        return () => query.listeners.delete(listener);
      },
    }),
  };
  return { useQueryClient: () => client };
});
vi.mock('src/utils/waitForAnimationFrames', () => ({ waitForAnimationFrames: () => Promise.resolve() }));

describe('ReadyForPrint', () => {
  beforeEach(() => {
    query.fetching = 0;
  });

  it.each(['data-fatal-error', 'data-loading'])(
    'never publishes readiness when %s appears as a query settles',
    async (attribute) => {
      query.fetching = 1;
      const view = render(<ReadyForPrint type='print' />);
      await act(async () => {});

      const exposed: string[] = [];
      const originalSetAttribute = Element.prototype.setAttribute;
      const idDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'id')!;
      const recordId = (id: string) => {
        if (id === 'readyForPrint') {
          exposed.push(id);
        }
      };
      const attributeSpy = vi.spyOn(Element.prototype, 'setAttribute').mockImplementation(function (name, value) {
        if (name === 'id') {
          recordId(value);
        }
        originalSetAttribute.call(this, name, value);
      });
      const idSpy = vi.spyOn(Element.prototype, 'id', 'set').mockImplementation(function (value) {
        recordId(value);
        idDescriptor.set!.call(this, value);
      });
      try {
        query.fetching = 0;
        query.listeners.forEach((notify) => notify());
        view.rerender(
          <>
            <ReadyForPrint type='print' />
            <div {...{ [attribute]: true }} />
          </>,
        );
        await act(async () => {
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        });
        expect(exposed).toEqual([]);
        expect(document.getElementById('readyForPrint')).toBeNull();
      } finally {
        attributeSpy.mockRestore();
        idSpy.mockRestore();
      }
    },
  );

  it('withdraws readiness synchronously when another query starts', async () => {
    render(<ReadyForPrint type='print' />);
    await waitFor(() => expect(document.getElementById('readyForPrint')).not.toBeNull());
    query.fetching = 1;
    query.listeners.forEach((notify) => notify());
    expect(document.getElementById('readyForPrint')).toBeNull();
    query.fetching = 0;
    query.listeners.forEach((notify) => notify());
    await waitFor(() => expect(document.getElementById('readyForPrint')).not.toBeNull());
  });

  it('withdraws readiness for DOM errors and restores it when they are removed', async () => {
    render(<ReadyForPrint type='print' />);
    await waitFor(() => expect(document.getElementById('readyForPrint')).not.toBeNull());
    const error = document.createElement('div');
    error.setAttribute('data-fatal-error', 'true');
    document.body.append(error);
    await act(async () => {});
    expect(document.getElementById('readyForPrint')).toBeNull();
    error.remove();
    await waitFor(() => expect(document.getElementById('readyForPrint')).not.toBeNull());
  });

  it('allows the loading marker while displaying a fatal error', async () => {
    render(
      <>
        <ReadyForPrint type='load' />
        <div data-fatal-error />
      </>,
    );
    await waitFor(() => expect(document.getElementById('finishedLoading')).not.toBeNull());
    expect(document.getElementById('readyForPrint')).toBeNull();
  });
});
