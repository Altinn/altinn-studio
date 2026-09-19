import { formatEngineErrorMessage, readEngineErrorMessage } from './engineErrorMessage';

const message =
  'AppCommand execution failed with status code InternalServerError: {"title":"PdfGenerationException","status":500,"workflowFailureCode":"PDF_GENERATION_FAILED"}';

describe('readEngineErrorMessage', () => {
  it('lifts the title and the failure code out of the problem body behind the engine prefix', () => {
    expect(readEngineErrorMessage(message)).toEqual({
      title: 'PdfGenerationException',
      failureCode: 'PDF_GENERATION_FAILED',
      prefix: 'AppCommand execution failed with status code InternalServerError:',
      body: {
        title: 'PdfGenerationException',
        status: 500,
        workflowFailureCode: 'PDF_GENERATION_FAILED',
      },
    });
  });

  it('finds nothing in other braces, in other JSON, or in no body at all', () => {
    expect(readEngineErrorMessage('Timed out after {30s}')).toEqual({});
    expect(readEngineErrorMessage('Answer: [{"title":"x"}]')).toEqual({});
    expect(readEngineErrorMessage('Boom went the pipeline')).toEqual({});
  });
});

describe('formatEngineErrorMessage', () => {
  it('lays the body out as JSON under the prefix', () => {
    expect(formatEngineErrorMessage(message)).toBe(
      'AppCommand execution failed with status code InternalServerError:\n' +
        '{\n  "title": "PdfGenerationException",\n  "status": 500,\n  "workflowFailureCode": "PDF_GENERATION_FAILED"\n}',
    );
  });

  it('shows a message without a body as it came', () => {
    expect(formatEngineErrorMessage('Boom went the pipeline')).toBe('Boom went the pipeline');
    expect(formatEngineErrorMessage('Timed out after {30s}')).toBe('Timed out after {30s}');
  });
});
