import React from 'react';

import { act, render, screen, waitFor } from '@testing-library/react';

import { ReadyForPrint } from 'src/components/ReadyForPrint';
import { useLogoSvg } from 'src/core/queries/logo';
import { createQueryTestWrapper } from 'src/test/queryTestUtils';
import { waitForAnimationFrames } from 'src/utils/waitForAnimationFrames';

function QueryResult({ attribute }: { attribute?: string }) {
  const { data } = useLogoSvg();
  if (data === undefined) {
    return <div data-loading />;
  }
  return attribute ? <div {...{ [attribute]: true }} /> : <div>{data}</div>;
}

function renderWithQueries(children: React.ReactNode, load?: () => Promise<string>) {
  const queryTest = createQueryTestWrapper({ queries: { fetchLogo: load } });
  return render(children, { wrapper: queryTest.wrapper });
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
            <QueryResult attribute={attribute} />
            <ReadyForPrint type='print' />
          </>,
          () => result.promise,
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
        <QueryResult />
        <ReadyForPrint type='print' />
      </>,
      () => result.promise,
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
    const result = Promise.withResolvers<string>();
    const { rerender } = renderWithQueries(<ReadyForPrint type='print' />, () => result.promise);
    rerender(
      <>
        <QueryResult />
        <ReadyForPrint type='print' />
      </>,
    );
    await act(async () => {
      await waitForAnimationFrames(2);
    });
    expect(document.getElementById('readyForPrint')).toBeNull();
    await act(async () => result.resolve('Done'));
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
