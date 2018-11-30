export function getComponentHelperTextByComponentLabel(componentLabel: string, language: any): string {
  switch (componentLabel) {
    case 'Header': {
      return language.ux_editor.helper_text_for_header;
    }
    case 'Input': {
      return language.ux_editor.helper_text_for_input;
    }
    case 'Checkboxes': {
      return language.ux_editor.helper_text_for_check_box;
    }
    case 'RadioButtons': {
      return language.ux_editor.helper_text_for_radio_button;
    }
    default: {
      return language.ux_editor.helper_text_default;
    }
  }
}
