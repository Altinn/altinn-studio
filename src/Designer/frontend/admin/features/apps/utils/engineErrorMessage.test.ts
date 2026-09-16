import { failureCodeOf } from './engineErrorMessage';

describe('failureCodeOf', () => {
  it('lifts the failure code out of the problem body behind the engine prefix', () => {
    expect(
      failureCodeOf(
        'AppCommand execution failed with status code InternalServerError: {"title":"PdfGenerationException","status":500,"workflowFailureCode":"PDF_GENERATION_FAILED"}',
      ),
    ).toBe('PDF_GENERATION_FAILED');
  });

  it('finds none in a body without one, in other braces, or in no body at all', () => {
    expect(
      failureCodeOf(
        'AppCommand failed with client error BadRequest: {"title":"Invalid","status":400}',
      ),
    ).toBeUndefined();
    expect(failureCodeOf('Timed out after {30s}')).toBeUndefined();
    expect(failureCodeOf('Boom went the pipeline')).toBeUndefined();
  });
});
