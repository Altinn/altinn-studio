import { parseEngineErrorMessage } from './engineErrorMessage';

const prefix = 'AppCommand execution failed with status code InternalServerError';

describe('parseEngineErrorMessage', () => {
  it('unpacks a problem-details body from behind the engine prefix', () => {
    const message = `${prefix}: {"type":"https://tools.ietf.org/html/rfc9110#section-15.6.1","title":"PdfGenerationException","status":500,"detail":"Could not generate the PDF","workflowFailureCode":"PDF_GENERATION_FAILED","nonRetryable":false}`;

    expect(parseEngineErrorMessage(message)).toEqual({
      raw: message,
      prefix,
      title: 'PdfGenerationException',
      detail: 'Could not generate the PDF',
      status: 500,
      failureCode: 'PDF_GENERATION_FAILED',
    });
  });

  it('keeps every other scalar field, such as the trace id, and drops only what is said elsewhere', () => {
    const message = `${prefix}: {"type":"https://tools.ietf.org/html/rfc9110#section-15.6.1","title":"Invalid State","status":422,"detail":"State could not be restored.","nonRetryable":true,"traceId":"00-e74e2d6ae60e-01","instance":"/instances/1","attempt":3,"nested":{"ignored":true}}`;

    expect(parseEngineErrorMessage(message).extensions).toEqual([
      ['traceId', '00-e74e2d6ae60e-01'],
      ['instance', '/instances/1'],
      ['attempt', '3'],
    ]);
  });

  it('flattens validation errors, naming the field unless it is the JSON root', () => {
    const message =
      'AppCommand failed with client error BadRequest: {"type":"https://tools.ietf.org/html/rfc9110#section-15.5.1","title":"One or more validation errors occurred.","status":400,"errors":{"$":["Missing required properties: lockToken."],"payload":["The payload field is required."]}}';

    expect(parseEngineErrorMessage(message)).toEqual({
      raw: message,
      prefix: 'AppCommand failed with client error BadRequest',
      title: 'One or more validation errors occurred.',
      status: 400,
      validationErrors: [
        'Missing required properties: lockToken.',
        'payload: The payload field is required.',
      ],
    });
  });

  it('keeps a message without a body as it came', () => {
    expect(parseEngineErrorMessage('Boom went the pipeline')).toEqual({
      raw: 'Boom went the pipeline',
    });
  });

  it('does not mistake other braces, or other JSON, for a problem body', () => {
    expect(parseEngineErrorMessage('Timed out after {30s}')).toEqual({
      raw: 'Timed out after {30s}',
    });
    expect(parseEngineErrorMessage('Answer: {"foo":1}')).toEqual({ raw: 'Answer: {"foo":1}' });
    expect(parseEngineErrorMessage('Answer: [{"title":"x"}]')).toEqual({
      raw: 'Answer: [{"title":"x"}]',
    });
  });
});
