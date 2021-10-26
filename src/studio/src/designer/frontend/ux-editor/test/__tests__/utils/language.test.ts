import 'jest';
import { getComponentHelperTextByComponentType } from '../../../utils/language';
import { ComponentTypes } from '../../../components';

const language = {
  ux_editor: {
    helper_text_for_header: 'header help text',
    helper_text_for_input: 'input help text',
    helper_text_for_check_box: 'checkbox help text',
    helper_text_for_radio_button: 'radio help text',
    helper_text_for_image: 'image help text',
    helper_text_for_attachment_list: 'attachment list help text',
    helper_text_default: 'default help text',
  },
};

describe('Designer > utils/language', () => {
  it('should return specific help text when component type is known', () => {
    expect(
      getComponentHelperTextByComponentType(ComponentTypes.Header, language),
    ).toBe(language.ux_editor.helper_text_for_header);
    expect(
      getComponentHelperTextByComponentType(ComponentTypes.Input, language),
    ).toBe(language.ux_editor.helper_text_for_input);
    expect(
      getComponentHelperTextByComponentType(
        ComponentTypes.Checkboxes,
        language,
      ),
    ).toBe(language.ux_editor.helper_text_for_check_box);
    expect(
      getComponentHelperTextByComponentType(
        ComponentTypes.RadioButtons,
        language,
      ),
    ).toBe(language.ux_editor.helper_text_for_radio_button);
    expect(
      getComponentHelperTextByComponentType(ComponentTypes.Image, language),
    ).toBe(language.ux_editor.helper_text_for_image);
    expect(
      getComponentHelperTextByComponentType(
        ComponentTypes.AttachmentList,
        language,
      ),
    ).toBe(language.ux_editor.helper_text_for_attachment_list);
  });

  it('should return fallback help text when component type is unknown', () => {
    const unknownComponentTypes = [
      ComponentTypes.Paragraph,
      ComponentTypes.Datepicker,
      ComponentTypes.Dropdown,
      ComponentTypes.TextArea,
      ComponentTypes.FileUpload,
      ComponentTypes.Button,
      ComponentTypes.AddressComponent,
      ComponentTypes.Group,
      ComponentTypes.NavigationButtons,
      'undefined-component-type',
    ];

    unknownComponentTypes.forEach((componentType) => {
      expect(
        getComponentHelperTextByComponentType(componentType, language),
      ).toBe(language.ux_editor.helper_text_default);
    });
  });
});
