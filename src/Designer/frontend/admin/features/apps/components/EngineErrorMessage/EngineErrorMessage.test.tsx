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
  it('shows the whole message as it came, as verbatim technical text', () => {
    renderEngineErrorMessage(entry());

    expect(screen.getByText(problemMessage).tagName).toBe('CODE');
    // Nothing is lifted out of the message and said again beside it.
    expect(screen.queryByText('Could not generate the PDF')).not.toBeInTheDocument();
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

  it('leaves the status out when the engine recorded none', () => {
    renderEngineErrorMessage(entry({ message: 'Boom went the pipeline', httpStatusCode: null }));

    expect(screen.getByText('Boom went the pipeline').tagName).toBe('CODE');
    expect(screen.queryByText(/http_status/)).not.toBeInTheDocument();
    expect(
      screen.getByText(textMock('admin.workflows.error.retryable'), { exact: false }),
    ).toBeInTheDocument();
  });
});

const renderEngineErrorMessage = (errorEntry: WorkflowErrorEntry) =>
  render(<EngineErrorMessage entry={errorEntry} />);
