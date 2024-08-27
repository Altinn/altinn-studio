import React from 'react';
import type { PropsWithChildren } from 'react';

import type { UseQueryResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { createContext } from 'src/core/contexts/context';
import { DisplayError as DefaultDisplayError } from 'src/core/errorHandling/DisplayError';
import { Loader as DefaultLoader } from 'src/core/loading/Loader';
import type { LaxContextProps, StrictContextProps } from 'src/core/contexts/context';

type Err = Error | AxiosError;
type QueryResult<T> = Pick<UseQueryResult<T, Err>, 'data' | 'isLoading' | 'error'>;
type QueryResultOptional<T> = QueryResult<T> & { enabled: boolean };
type Query<Req extends boolean, QueryData> = () => Req extends true
  ? QueryResult<QueryData>
  : QueryResultOptional<QueryData>;

type ContextProps<Ctx, Req extends boolean> = Req extends true ? StrictContextProps : LaxContextProps<Ctx>;

export type QueryContextProps<QueryData, Req extends boolean, ContextData = QueryData> = ContextProps<
  ContextData,
  Req
> & {
  query: Query<Req, QueryData>;

  process?: (data: QueryData) => ContextData;
  shouldDisplayError?: (error: Err) => boolean;

  DisplayError?: React.ComponentType<{ error: Err }>;
  Loader?: React.ComponentType<{ reason: string }>;
};

/**
 * A query context is a context that is based on a query. It will show a loading indicator if the query is loading,
 * and an error message if the query fails.
 *
 * Remember to call this through a delayedContext() call to prevent problems with cyclic imports.
 * @see delayedContext
 */
export function createQueryContext<QD, Req extends boolean, CD = QD>(props: QueryContextProps<QD, Req, CD>) {
  const {
    name,
    required,
    query,
    process = (i: QD) => i as unknown as CD,
    shouldDisplayError = () => true,
    DisplayError = DefaultDisplayError,
    Loader = DefaultLoader,
    ...rest
  } = props;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { Provider, useCtx, useLaxCtx, useHasProvider } = createContext<CD>({ name, required, ...(rest as any) });
  const defaultValue = ('default' in rest ? rest.default : undefined) as CD;

  const WrappingProvider = ({ children }: PropsWithChildren) => {
    const { data, isLoading, error, ...rest } = query();
    const enabled = 'enabled' in rest && !required ? rest.enabled : true;

    if (enabled && isLoading) {
      return <Loader reason={`query-${name}`} />;
    }

    if (error && shouldDisplayError(error)) {
      return <DisplayError error={error as Error} />;
    }

    return <Provider value={enabled ? process(data as QD) : defaultValue}>{children}</Provider>;
  };

  return {
    Provider: WrappingProvider,
    useCtx,
    useLaxCtx,
    useHasProvider,
  };
}
