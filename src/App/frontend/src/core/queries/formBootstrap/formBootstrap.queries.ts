import type { QueryClient } from '@tanstack/react-query';

import type { FormBootstrapQueryOptions } from 'src/core/queries/formBootstrap';

interface FormBootstrapQueryKeyArgs {
  options: FormBootstrapQueryOptions;
  isStateless: boolean;
  instanceId: string | undefined;
  isPdf: boolean;
  language: string;
}

export const formBootstrapQueryKeys = {
  all: () => ['formBootstrap'] as const,
  withParams: ({ options, isStateless, instanceId, isPdf, language }: FormBootstrapQueryKeyArgs) =>
    [
      ...formBootstrapQueryKeys.all(),
      options,
      isStateless ? 'stateless' : 'instance',
      instanceId,
      isPdf,
      language,
    ] as const,
};

export async function invalidateFormBootstrapQueries(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: formBootstrapQueryKeys.all() });
}
