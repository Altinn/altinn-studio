import { textMock } from '@studio/testing/mocks/i18nMock';
import { useValidateLayoutSetName } from 'app-shared/hooks/useValidateLayoutSetName';

describe('useValidateLayoutSetName', () => {
  it('should return invalid layoutSetName errorText when name is invalid', () => {
    const existingLayoutSetName = 'existingLayoutSetName';
    const { validateLayoutSetName } = useValidateLayoutSetName();
    const layoutSetNameValidation = validateLayoutSetName(existingLayoutSetName, {
      sets: [{ id: existingLayoutSetName, tasks: [] }],
    });
    expect(layoutSetNameValidation).toBe(
      textMock('process_editor.configuration_panel_layout_set_id_not_unique'),
    );
  });

  it('should return empty string when name is valid', () => {
    const uniqueLayoutSetName = 'uniqueLayoutSetName';
    const { validateLayoutSetName } = useValidateLayoutSetName();
    const layoutSetNameValidation = validateLayoutSetName(uniqueLayoutSetName, {
      sets: [{ id: 'existingLayoutSetName', tasks: [] }],
    });
    expect(layoutSetNameValidation).toBe('');
  });
});
