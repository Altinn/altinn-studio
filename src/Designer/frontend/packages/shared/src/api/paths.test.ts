import { processEditorDataTypePath, repoDownloadPath } from './paths';
import { app, org } from '@studio/testing/testids';

describe('paths', () => {
  test('Params works as intended', () => {
    const url = repoDownloadPath(org, app, true);
    expect(url.endsWith('full=true')).toBeTruthy();
  });

  describe('processEditorDataTypePath', () => {
    // The backend binds a repeated key to its List<string> parameter, so each content type is its own
    // key rather than an indexed or comma joined one.
    test('Repeats the key for each allowed content type', () => {
      const url = processEditorDataTypePath(org, app, 'signatures-pdf-1234', 'task_1', ['application/pdf', 'application/json']);
      expect(url).toContain('allowedContentTypes=application%2Fpdf&allowedContentTypes=application%2Fjson');
    });

    // Callers that predate the parameter must keep producing the url they produced before, so the
    // backend keeps applying its own default.
    test('Leaves the query untouched when no content types are given', () => {
      const url = processEditorDataTypePath(org, app, 'signatures-pdf-1234', 'task_1');
      expect(url).toBe(`/designer/api/${org}/${app}/process-modelling/data-type/signatures-pdf-1234?taskId=task_1`);
    });
  });
});
