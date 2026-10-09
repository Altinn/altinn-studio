import { QueryClient, QueryObserver } from '@tanstack/react-query';

import { createQueryCacheObserver } from 'src/core/queries/expressionQueryReaders';

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
}

it('ignores observer lifecycle while reporting actual cache changes', () => {
  const client = makeClient();
  client.setQueryData(['instance'], { process: 'first' });
  const onChange = vi.fn();
  const unsubscribe = createQueryCacheObserver(client).subscribe(onChange);
  const observer = new QueryObserver(client, { queryKey: ['instance'], enabled: false });
  const unsubscribeObserver = observer.subscribe(() => {});
  observer.setOptions({ queryKey: ['instance'], enabled: false, staleTime: 1000 });
  expect(onChange).not.toHaveBeenCalled();

  client.setQueryData(['instance'], { process: 'second' });
  expect(onChange).toHaveBeenCalledTimes(1);
  unsubscribeObserver();
  expect(onChange).toHaveBeenCalledTimes(1);
  unsubscribe();
});

it('reports creation with initial data even without a later update', () => {
  const client = makeClient();
  const snapshots: unknown[] = [];
  const unsubscribe = createQueryCacheObserver(client).subscribe(() => snapshots.push(client.getQueryData(['seeded'])));
  client.getQueryCache().build(client, { queryKey: ['seeded'], initialData: { value: 'initial' } });
  expect(snapshots).toEqual([{ value: 'initial' }]);
  unsubscribe();
});

it('preserves external API status and error changes', async () => {
  const client = makeClient();
  const snapshots: unknown[] = [];
  const unsubscribe = createQueryCacheObserver(client).subscribe(() =>
    snapshots.push(client.getQueryState(['external'])),
  );
  const failure = new Error('Failed external API');
  await expect(
    client.fetchQuery({
      queryKey: ['external'],
      queryFn: async () => {
        throw failure;
      },
    }),
  ).rejects.toThrow(failure);
  expect(snapshots).toContainEqual(expect.objectContaining({ fetchStatus: 'fetching' }));
  expect(snapshots).toContainEqual(expect.objectContaining({ status: 'error', error: failure }));
  const query = client.getQueryCache().find({ queryKey: ['external'] })!;
  query.setState({ fetchStatus: 'paused' });
  expect(snapshots.at(-1)).toEqual(expect.objectContaining({ fetchStatus: 'paused' }));
  unsubscribe();
});

it('reports invalidation, reset, removal, and clearing cached text resources', async () => {
  const client = makeClient();
  client.getQueryCache().build(client, { queryKey: ['textResources', 'nn'], initialData: { title: 'Initial' } });
  client.setQueryData(['textResources', 'nn'], { title: 'Updated' });
  const onChange = vi.fn();
  const unsubscribe = createQueryCacheObserver(client).subscribe(onChange);
  await client.invalidateQueries({ queryKey: ['textResources', 'nn'], refetchType: 'none' });
  expect(onChange).toHaveBeenCalledTimes(1);
  await client.resetQueries({ queryKey: ['textResources', 'nn'] });
  expect(onChange).toHaveBeenCalledTimes(2);
  expect(client.getQueryData(['textResources', 'nn'])).toEqual({ title: 'Initial' });
  client.removeQueries({ queryKey: ['textResources', 'nn'] });
  expect(onChange).toHaveBeenCalledTimes(3);
  client.setQueryData(['textResources', 'nb'], { title: 'Bokmål' });
  onChange.mockClear();
  client.clear();
  expect(onChange).toHaveBeenCalledTimes(1);
  unsubscribe();
});

it('shares one cache subscription and removes it after the last listener', () => {
  const client = makeClient();
  const spy = vi.spyOn(client.getQueryCache(), 'subscribe');
  const observer = createQueryCacheObserver(client);
  const first = vi.fn();
  const second = vi.fn();
  const unsubscribeFirst = observer.subscribe(first);
  const unsubscribeSecond = observer.subscribe(second);
  expect(spy).toHaveBeenCalledTimes(1);
  client.setQueryData(['value'], 1);
  expect(first).toHaveBeenCalled();
  expect(second).toHaveBeenCalled();
  unsubscribeFirst();
  unsubscribeSecond();
  first.mockClear();
  second.mockClear();
  client.setQueryData(['value'], 2);
  expect(first).not.toHaveBeenCalled();
  expect(second).not.toHaveBeenCalled();
  const unsubscribeAgain = observer.subscribe(first);
  expect(spy).toHaveBeenCalledTimes(2);
  unsubscribeAgain();
});
