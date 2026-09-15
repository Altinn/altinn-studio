import { getServiceTaskTypeErrorKey, getServiceTaskTypeWarningKey } from './serviceTaskTypeUtils';

describe('serviceTaskTypeUtils', () => {
  describe('getServiceTaskTypeErrorKey', () => {
    it('requires a value', () => {
      expect(getServiceTaskTypeErrorKey('')).toBe('validation_errors.required');
    });

    it('treats a value of only whitespace as missing', () => {
      expect(getServiceTaskTypeErrorKey('   ')).toBe('validation_errors.required');
    });

    it('accepts a type it cannot verify, since only the app knows its own implementations', () => {
      expect(getServiceTaskTypeErrorKey('myOwnServiceTask')).toBeNull();
    });
  });

  // The second argument is the type the panel was opened on. A generic service task opens on the
  // empty type, so that is the default here.
  describe('getServiceTaskTypeWarningKey', () => {
    const builtInWarning = 'process_editor.configuration_panel_service_task_type_built_in_warning';
    const warningFor = (taskType: string, taskTypeWhenOpened: string = ''): string | null =>
      getServiceTaskTypeWarningKey(taskType, taskTypeWhenOpened);

    it.each(['pdf', 'eFormidling', 'subformPdf', 'fiksArkiv', 'data', 'signing'])(
      'warns when %s is typed into a task that did not have it',
      (taskType) => {
        expect(warningFor(taskType)).toBe(builtInWarning);
      },
    );

    it.each(['PDF', 'eformidling', 'FiksArkiv'])(
      'warns for %s too, because the runtime matches the type ignoring case',
      (taskType) => {
        expect(warningFor(taskType)).toBe(builtInWarning);
      },
    );

    it('ignores surrounding whitespace when comparing', () => {
      expect(warningFor('  pdf  ')).toBe(builtInWarning);
    });

    // A task the palette created as one of these arrives with the type already set. Telling its
    // owner to create it from the palette would be advice they have already followed.
    it.each(['eFormidling', 'subformPdf', 'fiksArkiv'])(
      'stays quiet for a task that was opened on the built in type %s',
      (taskType) => {
        expect(warningFor(taskType, taskType)).toBeNull();
      },
    );

    it('warns again once the developer changes an opened-on built in type to another one', () => {
      expect(warningFor('pdf', 'eFormidling')).toBe(builtInWarning);
    });

    it('does not warn about a type of the app’s own', () => {
      expect(warningFor('pdfIfRequested')).toBeNull();
    });

    it('leaves an empty value to the error rule', () => {
      expect(warningFor('')).toBeNull();
    });
  });
});
