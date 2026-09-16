import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

const problemMessage =
  'AppCommand execution failed with status code InternalServerError: {"title":"PdfGenerationException","status":500,"detail":"Could not generate the PDF"}';

const failedHeadWorkflow = {
  databaseId: headWorkflowId,
  collectionKey: instanceId,
  operationId: 'Process next: Pdf -> Sign',
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
      // A step that stopped waiting keeps the reason it last waited for: it is history, not a live
      // block, and the engine leaves it on the step either way.
      status: 'Failed',
      command: { type: 'AppCommand' },
      retryCount: 3,
      deferCount: 2,
      lastDeferReason: 'venter på signering',
      errorHistory: [
        {
          timestamp: '2026-08-02T10:02:00Z',
          message: 'Boom went the pipeline',
          httpStatusCode: 503,
          wasRetryable: true,
        },
        {
          timestamp: '2026-08-02T10:04:00Z',
          message: problemMessage,
          httpStatusCode: 500,
          wasRetryable: false,
        },
      ],
    },
    {
      databaseId: 'step-2',
      operationId: 'send-eformidling',
      processingOrder: 1,
      status: 'Waiting',
      command: { type: 'AppCommand' },
      retryCount: 0,
      deferCount: 1,
      lastDeferReason: 'venter på kvittering',
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
    expect(summaries[0]).toHaveTextContent('Process next: Pdf -> Sign');
    expect(summaries[1]).toHaveTextContent('side-effects');
    expect(summaries[1]).toHaveTextContent(textMock('admin.workflows.side_effect'));

    const requestedUrl = jest.mocked(axios.get).mock.calls[0][0] as string;
    expect(requestedUrl).toContain(`collectionKey=${instanceId}`);
  });

  it('shows per-step status, retries and the error history', async () => {
    jest
      .mocked(axios.get)
      .mockResolvedValue({ status: 200, data: workflowsResponse } as AxiosResponse);
    renderInstanceWorkflows();

    expect(await screen.findByRole('cell', { name: 'app-command' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '3' })).toBeInTheDocument();
    expect(screen.getByText('Boom went the pipeline')).toBeInTheDocument();
    expect(
      screen.getByText(textMock('admin.workflows.step.defer_count', { times: 2 })),
    ).toBeInTheDocument();
  });

  it('sums the instance up above the list: verdict, transition, step, attempts and latest error', async () => {
    jest
      .mocked(axios.get)
      .mockResolvedValue({ status: 200, data: workflowsResponse } as AxiosResponse);
    renderInstanceWorkflows();

    const summary = await screen.findByRole('region', {
      name: textMock('admin.workflows.summary.title'),
    });
    expect(
      within(summary).getByText(textMock('admin.workflows.health.failed')),
    ).toBeInTheDocument();
    expect(within(summary).getByText(textMock('admin.workflows.summary.failed'))).toHaveTextContent(
      'Pdf → Sign',
    );
    expect(
      within(summary).getByText(
        textMock('admin.workflows.summary.step_of', { step: 1, total: 2 }),
        {
          exact: false,
        },
      ),
    ).toHaveTextContent('app-command');
    expect(within(summary).getByText('3')).toBeInTheDocument();
    // The latest error, unpacked: the newer of the two entries, not the first recorded one.
    expect(within(summary).getByText('PdfGenerationException')).toBeInTheDocument();
    expect(within(summary).queryByText('Boom went the pipeline')).not.toBeInTheDocument();
    expect(
      within(summary).getByRole('button', { name: textMock('admin.workflows.actions.retry') }),
    ).toBeInTheDocument();
  });

  it("lists a step's errors newest first, each with what the engine made of it", async () => {
    jest
      .mocked(axios.get)
      .mockResolvedValue({ status: 200, data: workflowsResponse } as AxiosResponse);
    renderInstanceWorkflows();

    const stepTable = await screen.findByRole('table');
    const messages = within(stepTable).getAllByText(
      (_, element) =>
        element?.tagName === 'CODE' &&
        ['Could not generate the PDF', 'Boom went the pipeline'].includes(
          element.textContent ?? '',
        ),
    );
    expect(messages.map((element) => element.textContent)).toEqual([
      'Could not generate the PDF',
      'Boom went the pipeline',
    ]);
    expect(
      within(stepTable).getByText(textMock('admin.workflows.error.http_status', { status: 503 })),
    ).toBeInTheDocument();
    expect(
      within(stepTable).getByText(textMock('admin.workflows.error.non_retryable')),
    ).toBeInTheDocument();
  });

  it('reads the defer reason as live only on the step that is actually waiting', async () => {
    jest
      .mocked(axios.get)
      .mockResolvedValue({ status: 200, data: workflowsResponse } as AxiosResponse);
    renderInstanceWorkflows();

    expect(
      await screen.findByText(textMock('admin.workflows.step.waiting_reason'), { exact: false }),
    ).toHaveTextContent('venter på kvittering');
    // The failed step's reason is kept for triage, but under a label that says it is history: the
    // step is not blocked on anything any more.
    expect(
      screen.getByText(textMock('admin.workflows.step.last_waiting_reason'), { exact: false }),
    ).toHaveTextContent('venter på signering');
    expect(
      screen.queryByText(textMock('admin.workflows.step.waiting_reason'), { exact: false }),
    ).not.toHaveTextContent('venter på signering');
  });

  it('keeps the loaded workflows when loading more of them fails', async () => {
    const user = userEvent.setup();
    const cursor = 'opaque-cursor';
    jest.mocked(axios.get).mockImplementation(async (url: string) => {
      if (url.includes(`cursor=${cursor}`)) {
        throw new AxiosError();
      }
      return { status: 200, data: { ...workflowsResponse, nextCursor: cursor } } as AxiosResponse;
    });
    renderInstanceWorkflows();

    await screen.findAllByRole('group');
    await user.click(screen.getByRole('button', { name: textMock('admin.workflows.fetch_more') }));

    // The query as a whole reports an error, but page one is still valid and still cached.
    expect(
      await screen.findByText(textMock('admin.workflows.fetch_more_error')),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('group')).toHaveLength(2);
    expect(screen.queryByText(textMock('general.page_error_title'))).not.toBeInTheDocument();
  });

  it('sets engine free text apart from the Norwegian copy around it', async () => {
    jest
      .mocked(axios.get)
      .mockResolvedValue({ status: 200, data: workflowsResponse } as AxiosResponse);
    renderInstanceWorkflows();

    const message = await screen.findByText('Boom went the pipeline');
    expect(message.tagName).toBe('CODE');
    expect(screen.getByText('venter på kvittering').tagName).toBe('CODE');
    // The transition name in the summary is the app's process model, shown as it came too.
    expect(screen.getByText('Pdf → Sign').tagName).toBe('SPAN');
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
