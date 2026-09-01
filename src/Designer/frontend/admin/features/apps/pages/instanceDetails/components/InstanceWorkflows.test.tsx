import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import axios, { AxiosError, type AxiosResponse } from 'axios';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { app, org } from '@studio/testing/testids';
import { OrgContext } from 'admin/contexts/OrgContext';
import { InstanceWorkflows } from './InstanceWorkflows';

jest.mock('axios', () => ({
  ...jest.requireActual('axios'),
  get: jest.fn(),
  post: jest.fn(),
}));

const environment = 'at23';
const envTitle = `${textMock('general.test_environment_alt').toLowerCase()} ${environment.toUpperCase()}`;
const orgMock = { username: org, full_name: 'Test Org', avatar_url: '', id: 1 };

const instanceId = '3a0e0f6e-4b1d-4a2a-9d31-6f8e2b7c1d55';
const headWorkflowId = 'aaaa1111-2222-4333-8444-555566667777';
const sideChainWorkflowId = 'bbbb1111-2222-4333-8444-555566667777';

const failedHeadWorkflow = {
  databaseId: headWorkflowId,
  collectionKey: instanceId,
  operationId: 'process/next',
  idempotencyKey: 'key-1',
  namespace: `${org}/${app}`,
  createdAt: '2026-08-02T10:00:00Z',
  updatedAt: '2026-08-02T10:05:00Z',
  overallStatus: 'Failed',
  steps: [
    {
      databaseId: 'step-1',
      operationId: 'app-command',
      processingOrder: 0,
      status: 'Failed',
      command: { type: 'AppCommand' },
      retryCount: 3,
      deferCount: 2,
      lastDeferReason: 'venter på signering',
      errorHistory: [
        {
          timestamp: '2026-08-02T10:04:00Z',
          message: 'Boom went the pipeline',
          wasRetryable: true,
        },
      ],
    },
  ],
};

const settledSideChainWorkflow = {
  databaseId: sideChainWorkflowId,
  collectionKey: instanceId,
  operationId: 'side-effects',
  idempotencyKey: 'key-2',
  namespace: `${org}/${app}`,
  createdAt: '2026-08-01T10:00:00Z',
  overallStatus: 'Completed',
  isHead: false,
  steps: [],
};

const workflowsResponse = {
  data: [failedHeadWorkflow, settledSideChainWorkflow],
  pageSize: 25,
  totalCount: 2,
  nextCursor: null,
};

describe('InstanceWorkflows', () => {
  afterEach(jest.clearAllMocks);

  it('lists the instance workflows newest first, marking the invisible side chain', async () => {
    jest
      .mocked(axios.get)
      .mockResolvedValue({ status: 200, data: workflowsResponse } as AxiosResponse);
    renderInstanceWorkflows();

    const summaries = await screen.findAllByRole('group');
    expect(summaries).toHaveLength(2);
    expect(summaries[0]).toHaveTextContent('process/next');
    expect(summaries[1]).toHaveTextContent('side-effects');
    expect(summaries[1]).toHaveTextContent(textMock('admin.workflows.side_effect'));

    const requestedUrl = jest.mocked(axios.get).mock.calls[0][0] as string;
    expect(requestedUrl).toContain(`collectionKey=${instanceId}`);
  });

  it('shows per-step status, retries, the waiting reason and the error history', async () => {
    jest
      .mocked(axios.get)
      .mockResolvedValue({ status: 200, data: workflowsResponse } as AxiosResponse);
    renderInstanceWorkflows();

    expect(await screen.findByRole('cell', { name: 'app-command' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '3' })).toBeInTheDocument();
    expect(
      screen.getByText(textMock('admin.workflows.step.waiting_reason'), { exact: false }),
    ).toHaveTextContent('venter på signering');
    expect(screen.getByText('Boom went the pipeline', { exact: false })).toBeInTheDocument();
    expect(
      screen.getByText(textMock('admin.workflows.step.defer_count', { times: 2 })),
    ).toBeInTheDocument();
  });

  it('spells out all three no-data causes when the engine holds nothing', async () => {
    jest.mocked(axios.get).mockResolvedValue({ status: 204, data: '' } as AxiosResponse);
    renderInstanceWorkflows();

    expect(await screen.findByText(textMock('admin.workflows.no_results'))).toBeInTheDocument();
  });

  it('reports an unreachable engine as unavailable', async () => {
    const error = new AxiosError();
    error.response = {
      status: 502,
      data: { type: 'urn:altinn:studio:designer:runtime-gateway-unavailable' },
    } as AxiosResponse;
    jest.mocked(axios.get).mockRejectedValue(error);
    renderInstanceWorkflows();

    expect(
      await screen.findByText(textMock('admin.workflows.unavailable', { envTitle })),
    ).toBeInTheDocument();
  });

  it('does not query the engine when the instance id is not a usable collection key', async () => {
    jest
      .mocked(axios.get)
      .mockResolvedValue({ status: 200, data: workflowsResponse } as AxiosResponse);
    renderInstanceWorkflows(createQueryClientMock(), 'not-a-guid');

    expect(await screen.findByText(textMock('admin.workflows.no_results'))).toBeInTheDocument();
    expect(axios.get).not.toHaveBeenCalled();
  });
});

const renderInstanceWorkflows = (
  client: QueryClient = createQueryClientMock(),
  id: string = instanceId,
) =>
  render(
    <MemoryRouter>
      <OrgContext.Provider value={orgMock}>
        <QueryClientProvider client={client}>
          <InstanceWorkflows org={org} environment={environment} app={app} instanceId={id} />
        </QueryClientProvider>
      </OrgContext.Provider>
    </MemoryRouter>,
  );
