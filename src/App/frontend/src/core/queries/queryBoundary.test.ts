import { ESLint } from 'eslint';

const eslint = new ESLint();
const boundaryRules = new Set([
  '@typescript-eslint/no-restricted-imports',
  'local/no-tanstack-reexports',
  'local/no-query-mocks',
]);

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

it.each([
  "vi.mock('src/core/queries/options');",
  "vi.doMock('src/core/queries/payment');",
  "vi.mock(import('src/core/queries/signeeList'));",
  "vi.mock('src/core/contexts/ApiProvider');",
  "vi.mock('src/features/instance/useProcessQuery');",
  "vi.mock('src/features/instance/InstanceContext');",
  "vi.mock('src/core/api-client/app.api');",
  "vi.mock('../../core/queries/options');",
  "import * as queries from 'src/core/queries/options'; vi.spyOn(queries, 'useOptionsQuery');",
  "vi.mock('axios');",
  "vi.mock('src/utils/network/networking');",
])('rejects bypassing API injection in a feature test: %s', async (code) => {
  expect(await boundaryErrors(code, 'src/layout/Dropdown/example.test.tsx')).toContainEqual(
    expect.objectContaining({ ruleId: 'local/no-query-mocks', severity: 2 }),
  );
});

it('rejects replacing TanStack itself in query tests', async () => {
  expect(await boundaryErrors("vi.mock('@tanstack/react-query');", 'src/core/queries/example.test.ts')).toContainEqual(
    expect.objectContaining({ ruleId: 'local/no-query-mocks', severity: 2 }),
  );
});

it('allows typed API injection in feature tests and transport mocks in API client tests', async () => {
  expect(
    await boundaryErrors(
      'renderWithProviders({ apis: { optionsApi: { fetchOptions: async () => ({ data: [], headers: {} }) } } });',
      'src/layout/Dropdown/example.test.tsx',
    ),
  ).toEqual([]);
  expect(
    await boundaryErrors("vi.mock('src/utils/network/sharedNetworking');", 'src/core/api-client/example.test.ts'),
  ).toEqual([]);
});
