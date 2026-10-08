import nb from '@altinn-studio/language/src/nb.json';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { getDefaultTaskName } from './getDefaultTaskName';

describe('getDefaultTaskName', () => {
  it('resolves the Norwegian name for the palette entry', () => {
    expect(getDefaultTaskName('user-controlled-signing')).toBe(
      textMock('process_editor.default_task_name.user_controlled_signing', { lng: 'nb' }),
    );
  });

  it.each([
    ['data', 'Utfylling'],
    ['feedback', 'Tilbakemelding'],
    ['signing', 'Signering'],
    ['user_controlled_signing', 'Brukerstyrt signering'],
    ['confirmation', 'Bekreftelse'],
    ['payment', 'Betaling'],
    ['pdf', 'Lag PDF'],
    ['subform_pdf', 'Lag PDF fra underskjema'],
    ['eformidling', 'Send med eFormidling'],
    ['fiks_arkiv', 'Send til Fiks Arkiv'],
    ['custom_service', 'Egendefinert systemoppgave'],
  ])('names a new %s task "%s"', (key, name) => {
    expect(nb[`process_editor.default_task_name.${key}`]).toBe(name);
  });
});
