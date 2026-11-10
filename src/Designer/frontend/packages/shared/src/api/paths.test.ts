import { describe, expect, test } from 'vitest';
import { processEditorDataTypePath, repoDownloadPath } from './paths';
import { app, org } from '@studio/testing/testids';

describe('paths', () => {
  test('Params works as intended', () => {
    const url = repoDownloadPath(org, app, true);
    expect(url.endsWith('full=true')).toBeTruthy();
  });

  describe('processEditorDataTypePath', () => {
    // The backend requires one query key per content type to bind the List<string> parameter.
    test('repeats the query key for each allowed content type', () => {
      const url = processEditorDataTypePath(org, app, 'signatures-pdf-1234', 'task_1', ['application/pdf', 'application/json']);
      expect(url).toContain('allowedContentTypes=application%2Fpdf&allowedContentTypes=application%2Fjson');
    });

    test('omits the content type query parameter when no types are specified', () => {
      const url = processEditorDataTypePath(org, app, 'signatures-pdf-1234', 'task_1');
      expect(url).toBe(`/designer/api/${org}/${app}/process-modelling/data-type/signatures-pdf-1234?taskId=task_1`);
    });
  });
});
