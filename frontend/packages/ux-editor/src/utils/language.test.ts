import { getComponentHelperTextByComponentType, getTextResource } from './language';
import { ComponentType } from 'app-shared/types/ComponentType';

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
    expect(getComponentHelperTextByComponentType(ComponentType.Header, language)).toBe(
      language['ux_editor.helper_text_for_header']
    );
    expect(getComponentHelperTextByComponentType(ComponentType.Input, language)).toBe(
      language['ux_editor.helper_text_for_input']
    );
    expect(getComponentHelperTextByComponentType(ComponentType.Checkboxes, language)).toBe(
      language['ux_editor.helper_text_for_check_box']
    );
    expect(getComponentHelperTextByComponentType(ComponentType.RadioButtons, language)).toBe(
      language['ux_editor.helper_text_for_radio_button']
    );
    expect(getComponentHelperTextByComponentType(ComponentType.Image, language)).toBe(
      language['ux_editor.helper_text_for_image']
    );
    expect(getComponentHelperTextByComponentType(ComponentType.AttachmentList, language)).toBe(
      language['ux_editor.helper_text_for_attachment_list']
    );
  });

  it('should return fallback help text when component type is unknown', () => {
    const unknownComponentTypes: ComponentType[] = [
      ComponentType.Paragraph,
      ComponentType.Datepicker,
      ComponentType.Dropdown,
      ComponentType.TextArea,
      ComponentType.FileUpload,
      ComponentType.AddressComponent,
      ComponentType.Group,
    ];

    unknownComponentTypes.forEach((componentType) => {
      expect(getComponentHelperTextByComponentType(componentType, language)).toBe(
        language['ux_editor.helper_text_default']
      );
    });
  });

  describe('getTextResource', () => {
    const textResources = [{ id: 'test', value: 'test' }];
    const textResource = textResources[0];

    it('should return the text resource', () => {
      expect(getTextResource(textResource.id, textResources)).toBe(textResource.value);
    });
    it('should return undefined when resourceKey is empty', () => {
      expect(getTextResource('', textResources)).toBeUndefined();
    });
    it('should return undefined when resources are empty', () => {
      expect(getTextResource(textResource.id, [])).toBeUndefined();
    });
    it('should return undefined when the text resource doesn\'t exist', () => {
      expect(getTextResource('wrong-id', textResources)).toBeUndefined();
    });
  })
});
