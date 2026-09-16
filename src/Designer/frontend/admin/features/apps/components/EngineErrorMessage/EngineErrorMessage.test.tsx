import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { WorkflowErrorEntry } from 'admin/features/apps/types/workflows/WorkflowStatus';
import { EngineErrorMessage } from './EngineErrorMessage';

const problemMessage =
  'AppCommand execution failed with status code InternalServerError: {"title":"PdfGenerationException","status":500,"detail":"Could not generate the PDF","workflowFailureCode":"PDF_GENERATION_FAILED"}';

const entry = (overrides: Partial<WorkflowErrorEntry> = {}): WorkflowErrorEntry => ({
  timestamp: '2026-08-02T10:04:00Z',
  message: problemMessage,
  httpStatusCode: 500,
  wasRetryable: true,
  ...overrides,
});

describe('EngineErrorMessage', () => {
  it('shows the problem title, detail and failure code as their own verbatim nodes', () => {
    renderEngineErrorMessage(entry());

    expect(screen.getByText('PdfGenerationException').tagName).toBe('CODE');
    expect(screen.getByText('Could not generate the PDF').tagName).toBe('CODE');
    expect(screen.getByText('PDF_GENERATION_FAILED').tagName).toBe('CODE');
    expect(
      screen.getByText('AppCommand execution failed with status code InternalServerError'),
    ).toBeInTheDocument();
    expect(screen.queryByText(problemMessage)).not.toBeInTheDocument();
  });

  it('tags the HTTP status and whether the engine classed the error as transient', () => {
    renderEngineErrorMessage(entry({ wasRetryable: false, httpStatusCode: 422 }));

    expect(
      screen.getByText(textMock('admin.workflows.error.http_status', { status: 422 })),
    ).toBeInTheDocument();
    expect(screen.getByText(textMock('admin.workflows.error.non_retryable'))).toBeInTheDocument();
    expect(screen.queryByText(textMock('admin.workflows.error.retryable'))).not.toBeInTheDocument();
  });

  it('shows a message without a problem body as it came', () => {
    renderEngineErrorMessage(entry({ message: 'Boom went the pipeline', httpStatusCode: null }));

    expect(screen.getByText('Boom went the pipeline').tagName).toBe('CODE');
    expect(screen.queryByText(/HTTP/)).not.toBeInTheDocument();
  });

  it('copies the raw message, not the unpacked view of it', async () => {
    const user = userEvent.setup();
    renderEngineErrorMessage(entry());

    await user.click(screen.getByRole('button', { name: textMock('admin.workflows.error.copy') }));

    expect(await navigator.clipboard.readText()).toBe(problemMessage);
    expect(
      screen.getByRole('button', { name: textMock('admin.workflows.error.copied') }),
    ).toBeInTheDocument();
  });
});

const renderEngineErrorMessage = (errorEntry: WorkflowErrorEntry) =>
  render(<EngineErrorMessage entry={errorEntry} />);
