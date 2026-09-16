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
  it('shows the problem title, detail and failure code as their own verbatim nodes, and the whole message', () => {
    renderEngineErrorMessage(entry());

    expect(screen.getByText('PdfGenerationException').tagName).toBe('CODE');
    expect(screen.getByText('Could not generate the PDF').tagName).toBe('CODE');
    expect(screen.getByText('PDF_GENERATION_FAILED').tagName).toBe('CODE');
    expect(screen.getByText(problemMessage).tagName).toBe('CODE');
  });

  it('keeps the trace id and other fields the app added', () => {
    const message =
      'AppCommand failed with client error UnprocessableEntity: {"title":"Invalid State","status":422,"detail":"State could not be restored.","nonRetryable":true,"traceId":"00-e74e2d6ae60e-01"}';
    renderEngineErrorMessage(entry({ message, httpStatusCode: 422, wasRetryable: false }));

    expect(screen.getByText('traceId')).toBeInTheDocument();
    expect(screen.getByText('00-e74e2d6ae60e-01')).toBeInTheDocument();
    expect(screen.queryByText('nonRetryable')).not.toBeInTheDocument();
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it('tags the HTTP status and whether the engine classed the error as transient', () => {
    renderEngineErrorMessage(entry({ wasRetryable: false, httpStatusCode: 422 }));

    expect(
      screen.getByText(textMock('admin.workflows.error.http_status', { status: 422 })),
    ).toBeInTheDocument();
    expect(screen.getByText(textMock('admin.workflows.error.non_retryable'))).toBeInTheDocument();
    expect(screen.queryByText(textMock('admin.workflows.error.retryable'))).not.toBeInTheDocument();
  });

  it('shows a message without a problem body as it came, once', () => {
    renderEngineErrorMessage(entry({ message: 'Boom went the pipeline', httpStatusCode: null }));

    expect(screen.getByText('Boom went the pipeline').tagName).toBe('CODE');
    expect(screen.queryByText(/HTTP/)).not.toBeInTheDocument();
  });
});

const renderEngineErrorMessage = (errorEntry: WorkflowErrorEntry) =>
  render(<EngineErrorMessage entry={errorEntry} />);
