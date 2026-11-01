import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import axios, { AxiosError, type AxiosResponse, type AxiosStatic } from 'axios';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { app, org } from '@studio/testing/testids';
import { OrgContext } from 'admin/contexts/OrgContext';
import { workflowCounts } from 'admin/testing/workflowCounts';
import { WorkflowProblems } from './WorkflowProblems';

vi.mock('axios', async () => {
  const actual = await vi.importActual<{ default: AxiosStatic }>('axios');
  return { ...actual, default: { ...actual.default, get: vi.fn() } };
});

const environment = 'at23';
const envTitle = `${textMock('general.test_environment_alt').toLowerCase()} ${environment.toUpperCase()}`;
const orgMock = { username: org, full_name: 'Test Org', avatar_url: '', id: 1 };

const firstPageKey = '3a0e0f6e-4b1d-4a2a-9d31-6f8e2b7c1d55';
const secondPageKey = '8b1d4f2c-9e77-4a55-b0aa-1c2d3e4f5061';
const cursor = 'opaque-cursor';

const collection = (key: string) => ({
  key,
  namespace: `${org}/${app}`,
  createdAt: '2026-08-01T10:00:00Z',
  updatedAt: '2026-08-02T11:00:00Z',
  workflowCounts: workflowCounts({
    total: 6,
    primary: { failed: 2 },
    auxiliary: { active: 1, failed: 3 },
  }),
});

const page = (key: string, nextCursor: string | null) => ({
  data: [collection(key)],
  pageSize: 25,
  totalCount: 2,
  nextCursor,
});

const respondWith = (
  handler: (url: string) => { status: number; data: unknown } | Promise<never>,
) => {
  vi.mocked(axios.get).mockImplementation(async (url: string) => handler(url) as AxiosResponse);
};

describe('WorkflowProblems', () => {
  it('lists failing instances from the discovery read with the counts that matter', async () => {
    respondWith(() => ({ status: 200, data: page(firstPageKey, null) }));
    renderWorkflowProblems();

    const link = await screen.findByRole('link', { name: firstPageKey });
    expect(link).toHaveAttribute('href', expect.stringContaining(`instances/${firstPageKey}`));
    expect(screen.getByRole('cell', { name: '2' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '3' })).toBeInTheDocument();
    expect(
      screen.getByText(textMock('admin.workflows.problems.total', { total: 2 })),
    ).toBeInTheDocument();

    const requestedUrl = vi.mocked(axios.get).mock.calls[0][0] as string;
    expect(requestedUrl).toContain('failures=Any');
    expect(requestedUrl).toContain('/collections');
  });

  it('pages with the engine cursor, which is separate from the instance list pager', async () => {
    const user = userEvent.setup();
    respondWith((url) =>
      url.includes(`cursor=${cursor}`)
        ? { status: 200, data: page(secondPageKey, null) }
        : { status: 200, data: page(firstPageKey, cursor) },
    );
    renderWorkflowProblems();

    await screen.findByRole('link', { name: firstPageKey });
    await user.click(
      screen.getByRole('button', { name: textMock('admin.workflows.problems.fetch_more') }),
    );

    expect(await screen.findByRole('link', { name: secondPageKey })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: firstPageKey })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: textMock('admin.workflows.problems.fetch_more') }),
    ).not.toBeInTheDocument();
  });

  it('keeps the loaded rows when loading more of them fails', async () => {
    const user = userEvent.setup();
    respondWith((url) =>
      url.includes(`cursor=${cursor}`)
        ? Promise.reject(new AxiosError())
        : { status: 200, data: page(firstPageKey, cursor) },
    );
    renderWorkflowProblems();

    await screen.findByRole('link', { name: firstPageKey });
    await user.click(
      screen.getByRole('button', { name: textMock('admin.workflows.problems.fetch_more') }),
    );

    expect(
      await screen.findByText(textMock('admin.workflows.problems.fetch_more_error')),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: firstPageKey })).toBeInTheDocument();
    expect(screen.queryByText(textMock('general.page_error_title'))).not.toBeInTheDocument();
  });

  it('narrows the discovery filter to a single failure kind', async () => {
    const user = userEvent.setup();
    respondWith(() => ({ status: 200, data: page(firstPageKey, null) }));
    renderWorkflowProblems();

    await screen.findByRole('link', { name: firstPageKey });
    await user.selectOptions(screen.getByRole('combobox'), JSON.stringify('Auxiliary'));

    await waitFor(() =>
      expect(
        vi
          .mocked(axios.get)
          .mock.calls.map(([url]) => url as string)
          .some((url) => url.includes('failures=Auxiliary')),
      ).toBe(true),
    );
  });

  it('shows a collection key that is not an instance id as plain text, not as a dead link', async () => {
    const notAnInstanceKey = 'batch/nightly-cleanup';
    respondWith(() => ({ status: 200, data: page(notAnInstanceKey, null) }));
    renderWorkflowProblems();

    expect(await screen.findByRole('cell', { name: notAnInstanceKey })).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('reports an empty discovery answer as nothing to fix', async () => {
    respondWith(() => ({ status: 204, data: '' }));
    renderWorkflowProblems();

    expect(
      await screen.findByText(textMock('admin.workflows.problems.no_results')),
    ).toBeInTheDocument();
  });

  it('reports an unreachable engine as unavailable rather than an error', async () => {
    const error = new AxiosError();
    error.response = {
      status: 502,
      data: { type: 'urn:altinn:studio:gateway:workflow-engine-unavailable' },
    } as AxiosResponse;
    respondWith(() => Promise.reject(error));
    renderWorkflowProblems();

    expect(
      await screen.findByText(textMock('admin.workflows.unavailable', { envTitle })),
    ).toBeInTheDocument();
    expect(screen.queryByText(textMock('general.page_error_title'))).not.toBeInTheDocument();
  });

  it('falls back to the generic error state for a real failure', async () => {
    respondWith(() => Promise.reject(new AxiosError()));
    renderWorkflowProblems();

    expect(await screen.findByText(textMock('general.page_error_title'))).toBeInTheDocument();
  });
});

const renderWorkflowProblems = (client: QueryClient = createQueryClientMock()) =>
  render(
    <MemoryRouter>
      <OrgContext.Provider value={orgMock}>
        <QueryClientProvider client={client}>
          <WorkflowProblems org={org} environment={environment} app={app} />
        </QueryClientProvider>
      </OrgContext.Provider>
    </MemoryRouter>,
  );
