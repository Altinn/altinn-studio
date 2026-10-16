import { QueryClient } from '@tanstack/react-query';

import { createExternalApiQueries } from 'src/core/queries/externalApi/externalApi.queries';

it('keeps snapshot identity stable until external API data or fetch state changes', () => {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
  const queries = createExternalApiQueries(client);
  const key = ['fetchExternalApi', '123/instance', 'example'];
  const snapshot = () => queries.getSnapshot('123/instance', 'example');
  expect(snapshot()).toBeUndefined();

  client.setQueryData(key, { value: 'first' });
  const first = snapshot();
  expect(first).toBeDefined();
  expect(snapshot()).toBe(first);
  expect(first).not.toHaveProperty('fetchStatus');

  client.getQueryCache().find({ queryKey: key })!.setState({ fetchStatus: 'fetching' });
  const fetching = snapshot();
  expect(fetching).not.toBe(first);
  expect(snapshot()).toBe(fetching);

  client.setQueryData(key, { value: 'second' });
  expect(snapshot()).not.toBe(fetching);
  expect(queries.getCached('123/instance', ['example']).data.example).toEqual({ value: 'second' });

  client.removeQueries({ queryKey: key });
  expect(snapshot()).toBeUndefined();
});
