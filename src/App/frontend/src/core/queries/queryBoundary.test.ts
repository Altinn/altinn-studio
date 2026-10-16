import { ESLint } from 'eslint';

const eslint = new ESLint();
const boundaryRules = new Set(['@typescript-eslint/no-restricted-imports', 'local/no-tanstack-reexports']);

async function boundaryErrors(code: string, filePath: string) {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.filter(({ ruleId }) => boundaryRules.has(ruleId ?? ''));
}

it.each([
  'src/features/example.ts',
  'src/core/example.ts',
  'src/routes/example.ts',
  'src/test/example.ts',
  'test/e2e/example.ts',
])('rejects direct TanStack imports in %s', async (filePath) => {
  const errors = await boundaryErrors("import { useQuery } from '@tanstack/react-query';", filePath);
  expect(errors).toContainEqual(expect.objectContaining({ severity: 2 }));
});

it.each(['@tanstack/query-core', '@tanstack/react-query/build/modern', '@tanstack/react-query-devtools'])(
  'rejects imports from %s outside queries',
  async (source) => {
    expect(await boundaryErrors(`import * as query from '${source}';`, 'src/features/example.ts')).not.toHaveLength(0);
  },
);

it.each([
  "export { useQuery } from '@tanstack/react-query';",
  "export * from '@tanstack/react-query';",
  "import { useQuery as internal } from '@tanstack/react-query'; export { internal as useQuery };",
  "import { useQuery as internal } from '@tanstack/react-query'; export const useQuery: typeof internal = internal;",
  "import { useQuery } from '@tanstack/react-query'; const alias = useQuery; export { alias };",
  "import * as query from '@tanstack/react-query'; export const useQuery = query.useQuery;",
  "import type { QueryClient as Internal } from '@tanstack/react-query'; export type QueryClient = Internal;",
  "import type { UseQueryOptions as Internal } from '@tanstack/react-query'; export type Options<T> = Internal<T>;",
  "import type { QueryClient } from '@tanstack/react-query'; type Alias = QueryClient; export type { Alias };",
  "import { useQuery } from '@tanstack/react-query'; export type Hook = typeof useQuery;",
  "import { useQuery } from '@tanstack/react-query'; export type Result = ReturnType<typeof useQuery>;",
  "import type { QueryClient } from '@tanstack/react-query'; export type Client = QueryClient | null;",
  "import type { UseQueryResult } from '@tanstack/react-query'; export interface Result extends UseQueryResult {}",
  "import { useQuery } from '@tanstack/react-query'; export const hooks = { useQuery };",
  "import { QueryClient } from '@tanstack/react-query'; export const client = new QueryClient();",
])('rejects a TanStack re-export: %s', async (code) => {
  const errors = await boundaryErrors(code, 'src/core/queries/example.ts');
  expect(errors).toContainEqual(expect.objectContaining({ ruleId: 'local/no-tanstack-reexports', severity: 2 }));
});

it('allows query implementations to import TanStack and export domain hooks', async () => {
  expect(
    await boundaryErrors(
      `
    import { useQuery } from '@tanstack/react-query';
    export function useExample() {
      const { data, error } = useQuery({ queryKey: ['example'], queryFn: async () => 'example' });
      return { data, error };
    }
  `,
      'src/core/queries/example.ts',
    ),
  ).toEqual([]);
});

it('allows public domain imports and rejects internal query definitions', async () => {
  expect(
    await boundaryErrors("import { useCurrentInstance } from 'src/core/queries/instance';", 'src/features/example.ts'),
  ).toEqual([]);
  expect(
    await boundaryErrors(
      "import { instanceDataQuery } from 'src/core/queries/instance/instance.queries';",
      'src/core/example.ts',
    ),
  ).not.toHaveLength(0);
  expect(
    await boundaryErrors(
      "import { mutationResult } from 'src/core/queries/mutationResult';",
      'src/features/example.ts',
    ),
  ).not.toHaveLength(0);
  expect(
    await boundaryErrors(
      "import { getQueryClient } from 'src/core/queries/queryClient.queries';",
      'src/routes/example.ts',
    ),
  ).not.toHaveLength(0);
});
