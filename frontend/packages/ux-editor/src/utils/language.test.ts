import { getComponentHelperTextByComponentType } from './language';
import { FormItemType } from 'app-shared/types/FormItemType';

const language = {
  'ux_editor.helper_text_for_header': 'header help text',
  'ux_editor.helper_text_for_input': 'input help text',
  'ux_editor.helper_text_for_check_box': 'checkbox help text',
  'ux_editor.helper_text_for_radio_button': 'radio help text',
  'ux_editor.helper_text_for_image': 'image help text',
  'ux_editor.helper_text_for_attachment_list': 'attachment list help text',
  'ux_editor.helper_text_default': 'default help text',
};

describe('Designer > utils/language', () => {
  it('should return specific help text when component type is known', () => {
    expect(getComponentHelperTextByComponentType(FormItemType.Header, language)).toBe(
      language['ux_editor.helper_text_for_header']
    );
    expect(getComponentHelperTextByComponentType(FormItemType.Input, language)).toBe(
      language['ux_editor.helper_text_for_input']
    );
    expect(getComponentHelperTextByComponentType(FormItemType.Checkboxes, language)).toBe(
      language['ux_editor.helper_text_for_check_box']
    );
    expect(getComponentHelperTextByComponentType(FormItemType.RadioButtons, language)).toBe(
      language['ux_editor.helper_text_for_radio_button']
    );
    expect(getComponentHelperTextByComponentType(FormItemType.Image, language)).toBe(
      language['ux_editor.helper_text_for_image']
    );
    expect(getComponentHelperTextByComponentType(FormItemType.AttachmentList, language)).toBe(
      language['ux_editor.helper_text_for_attachment_list']
    );
  });

  it('should return fallback help text when component type is unknown', () => {
    const unknownComponentTypes: FormItemType[] = [
      FormItemType.Paragraph,
      FormItemType.Datepicker,
      FormItemType.Dropdown,
      FormItemType.TextArea,
      FormItemType.FileUpload,
      FormItemType.AddressComponent,
      FormItemType.Group,
    ];

    unknownComponentTypes.forEach((componentType) => {
      expect(getComponentHelperTextByComponentType(componentType, language)).toBe(
        language['ux_editor.helper_text_default']
      );
    });
  });
});
