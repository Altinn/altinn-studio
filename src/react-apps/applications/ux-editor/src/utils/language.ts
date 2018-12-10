import { ComponentTypes } from '../components';
import { CollapsableMenus } from '../containers/Toolbar';

export function getComponentHelperTextByComponentType(componentType: ComponentTypes, language: any): string {
  switch (componentType) {
    case ComponentTypes.Header: {
      return language.ux_editor.helper_text_for_header;
    }
    case ComponentTypes.Input: {
      return language.ux_editor.helper_text_for_input;
    }
    case ComponentTypes.CheckBox: {
      return language.ux_editor.helper_text_for_check_box;
    }
    case ComponentTypes.RadioButton: {
      return language.ux_editor.helper_text_for_radio_button;
    }
    default: {
      // Several components does not yet have a helper text, a default is shown.
      return language.ux_editor.helper_text_default;
    }
  }
}

export function getComponentTitleByComponentType(componentType: ComponentTypes, language: any): string {
  switch (componentType) {
    case ComponentTypes.CheckBox: {
      return language.ux_editor.component_checkbox;
    }
    case ComponentTypes.Container: {
      return language.ux_editor.component_container;
    }
    case ComponentTypes.DropDown: {
      return language.ux_editor.component_dropdown;
    }
    case ComponentTypes.FileUpload: {
      return language.ux_editor.component_file_upload;
    }
    case ComponentTypes.Header: {
      return language.ux_editor.component_header;
    }
    case ComponentTypes.Input: {
      return language.ux_editor.component_input;
    }
    case ComponentTypes.Submit: {
      return language.ux_editor.component_submit;
    }
    case ComponentTypes.TextArea: {
      return language.ux_editor.component_text_area;
    }
    case ComponentTypes.RadioButton: {
      return language.ux_editor.component_radio_button;
    }
    case ComponentTypes.Paragraph: {
      return language.ux_editor.component_paragraph;
    }
    default: {
      return '';
    }
  }
}

export function getCollapsableMenuTitleByType(menu: CollapsableMenus, language: any): string {
  switch (menu) {
    case CollapsableMenus.Components: {
      return language.ux_editor.collapsable_schema_components;
    }
    case CollapsableMenus.Texts: {
      return language.ux_editor.collapsable_text_components;
    }
  }
}

export function truncate(s: string, size: number) {
  if (s.length > size) {
    return (s.substring(0, size) + '...');
  } else {
    return s;
  }
}

export function getTextResource(resourceKey: string, textResources: ITextResource[]): string {
  const textResource = textResources.find((resource) => resource.id === resourceKey);
  return textResource ? textResource.value : resourceKey;
}
