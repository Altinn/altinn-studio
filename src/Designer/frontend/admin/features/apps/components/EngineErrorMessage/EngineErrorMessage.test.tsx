import { render, screen } from '@testing-library/react';
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
  it('shows the whole message as it came, under the problem title as its headline', () => {
    renderEngineErrorMessage(entry());

    expect(screen.getByRole('heading', { name: 'PdfGenerationException' })).toBeInTheDocument();
    // The body is laid out as JSON under the engine's prefix, every field still there.
    const message = screen.getByText(/AppCommand execution failed/);
    expect(message.tagName).toBe('CODE');
    expect(message).toHaveTextContent('"detail": "Could not generate the PDF"');
    expect(message).toHaveTextContent('"workflowFailureCode": "PDF_GENERATION_FAILED"');
  });

  it('says when, the HTTP status, how the engine classed the error, and the failure code', () => {
    renderEngineErrorMessage(entry({ wasRetryable: false, httpStatusCode: 422 }));

    const meta = screen.getByText(textMock('admin.workflows.error.http_status', { status: 422 }), {
      exact: false,
    });
    expect(meta).toHaveTextContent(textMock('admin.workflows.error.non_retryable'));
    expect(meta).not.toHaveTextContent(textMock('admin.workflows.error.retryable'));
    expect(screen.getByText('PDF_GENERATION_FAILED').tagName).toBe('CODE');
  });

  it('leaves the status out when the engine recorded none, and has no headline without a title', () => {
    renderEngineErrorMessage(entry({ message: 'Boom went the pipeline', httpStatusCode: null }));

    expect(screen.getByText('Boom went the pipeline').tagName).toBe('CODE');
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.queryByText(/http_status/)).not.toBeInTheDocument();
    expect(
      screen.getByText(textMock('admin.workflows.error.retryable'), { exact: false }),
    ).toBeInTheDocument();
  });
});

const renderEngineErrorMessage = (errorEntry: WorkflowErrorEntry) =>
  render(<EngineErrorMessage entry={errorEntry} />);
