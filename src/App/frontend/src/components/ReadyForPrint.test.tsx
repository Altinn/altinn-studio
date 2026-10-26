import React from 'react';

// eslint-disable-next-line @typescript-eslint/no-restricted-imports -- This test needs an isolated real query cache and provider.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';

import { ReadyForPrint } from 'src/components/ReadyForPrint';
import { useQuery } from 'src/core/queries/reactQuery';
import { waitForAnimationFrames } from 'src/utils/waitForAnimationFrames';

function QueryResult({ load, attribute }: { load: () => Promise<string>; attribute?: string }) {
  const { data, isPending } = useQuery({ queryKey: ['options'], queryFn: load, retry: false });
  if (isPending) {
    return <div data-loading />;
  }
  return attribute ? <div {...{ [attribute]: true }} /> : <div>{data}</div>;
}

function renderWithQueries(children: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(<QueryClientProvider client={client}>{children}</QueryClientProvider>);
  return { ...view, client };
}

describe('ReadyForPrint', () => {
  it.each(['data-fatal-error', 'data-loading'])(
    'never publishes readiness when a query result renders %s',
    async (attribute) => {
      const result = Promise.withResolvers<string>();
      const published: string[] = [];
      const setAttribute = Element.prototype.setAttribute;
      const spy = vi.spyOn(Element.prototype, 'setAttribute').mockImplementation(function (name, value) {
        if (name === 'id' && value === 'readyForPrint') {
          published.push(value);
        }
        setAttribute.call(this, name, value);
      });
      try {
        renderWithQueries(
          <>
            <QueryResult
              load={() => result.promise}
              attribute={attribute}
            />
            <ReadyForPrint type='print' />
          </>,
        );
        await act(async () => {
          await waitForAnimationFrames(2);
        });
        await act(async () => result.resolve('Options loaded'));
        await waitFor(() => expect(document.querySelector(`[${attribute}]`)).not.toBeNull());
        await act(async () => {
          await waitForAnimationFrames(2);
        });
        expect(published).toEqual([]);
      } finally {
        spy.mockRestore();
      }
    },
  );

  it('publishes readiness after the query result has rendered', async () => {
    const result = Promise.withResolvers<string>();
    const { container } = renderWithQueries(
      <>
        <QueryResult load={() => result.promise} />
        <ReadyForPrint type='print' />
      </>,
    );
    const marker = container.lastElementChild;
    expect(marker).toHaveStyle({ display: 'none' });
    expect(marker).not.toHaveAttribute('id');
    await act(async () => result.resolve('Options loaded'));
    await waitFor(() => expect(marker).toHaveAttribute('id', 'readyForPrint'));
    expect(container.lastElementChild).toBe(marker);
    expect(screen.getByText('Options loaded')).toBeInTheDocument();
  });

  it('waits for another request that starts before readiness is published', async () => {
    const { client } = renderWithQueries(<ReadyForPrint type='print' />);
    const result = Promise.withResolvers<string>();
    let request: Promise<string>;
    await act(async () => {
      request = client.fetchQuery({ queryKey: ['later'], queryFn: () => result.promise });
    });
    await act(async () => {
      await waitForAnimationFrames(2);
    });
    expect(document.getElementById('readyForPrint')).toBeNull();
    await act(async () => {
      result.resolve('Done');
      await request;
    });
    await waitFor(() => expect(document.getElementById('readyForPrint')).not.toBeNull());
  });

  it('allows the loading marker while displaying a fatal error', async () => {
    renderWithQueries(
      <>
        <ReadyForPrint type='load' />
        <div data-fatal-error />
      </>,
    );
    await waitFor(() => expect(document.getElementById('finishedLoading')).not.toBeNull());
    expect(document.getElementById('readyForPrint')).toBeNull();
  });
});
