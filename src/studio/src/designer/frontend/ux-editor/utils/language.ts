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
    case ComponentTypes.Datepicker: {
      return language.ux_editor.component_datepicker;
    }
    case ComponentTypes.Button: {
      return language.ux_editor.component_button;
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
    case ComponentTypes.AddressComponent: {
      return language.ux_editor.component_advanced_address;
    }
    case ComponentTypes.Group: {
      return language.ux_editor.component_group;
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
    case CollapsableMenus.AdvancedComponents: {
      return language.ux_editor.collapsable_text_advanced_components;
    }
    default: {
      return '';
    }
  }
}

export function truncate(s: string, size: number) {
  if (s.length > size) {
    return (`${s.substring(0, size)}...`);
  }
  return s;
}

export function getTextResource(resourceKey: string, textResources: ITextResource[]): string {
  const textResource = textResources.find((resource) => resource.id === resourceKey);
  return textResource ? textResource.value : resourceKey;
}

export function formatCreateTextLabel(textToCreate: string, language: any): string {
  return language.general.create.concat(' ', textToCreate);
}
