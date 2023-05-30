import type { ITextResource } from 'app-shared/types/global';
import { CollapsableMenus } from '../types/global';
import { ComponentType } from 'app-shared/types/ComponentType';
import i18next from 'i18next';

export function getComponentHelperTextByComponentType(type: ComponentType, language: any): string {
  switch (type) {
    case ComponentType.Header: {
      return language['ux_editor.helper_text_for_header'];
    }
    case ComponentType.Input: {
      return language['ux_editor.helper_text_for_input'];
    }
    case ComponentType.Checkboxes: {
      return language['ux_editor.helper_text_for_check_box'];
    }
    case ComponentType.RadioButtons: {
      return language['ux_editor.helper_text_for_radio_button'];
    }
    case ComponentType.Image: {
      return language['ux_editor.helper_text_for_image'];
    }
    case ComponentType.AttachmentList: {
      return language['ux_editor.helper_text_for_attachment_list'];
    }
    case ComponentType.Button: {
      return language['ux_editor.helper_text_for_attachment_button'];
    }
    case ComponentType.NavigationBar: {
      return language['ux_editor.helper_text_for_nav_bar'];
    }
    default: {
      // Several components does not yet have a helper text, a default is shown.
      return language['ux_editor.helper_text_default'];
    }
  }
}

export function getComponentTitleByComponentType(type: ComponentType, t: typeof i18next.t): string {
  switch (type) {
    case ComponentType.Checkboxes: {
      return t('ux_editor.component_checkbox');
    }
    case ComponentType.Dropdown: {
      return t('ux_editor.component_dropdown');
    }
    case ComponentType.FileUpload: {
      return t('ux_editor.component_file_upload');
    }
    case ComponentType.FileUploadWithTag: {
      return t('ux_editor.component_file_upload_with_tag');
    }
    case ComponentType.Header: {
      return t('ux_editor.component_header');
    }
    case ComponentType.Input: {
      return t('ux_editor.component_input');
    }
    case ComponentType.Image: {
      return t('ux_editor.component_image');
    }
    case ComponentType.Datepicker: {
      return t('ux_editor.component_datepicker');
    }
    case ComponentType.Button: {
      return t('ux_editor.component_button');
    }
    case ComponentType.TextArea: {
      return t('ux_editor.component_text_area');
    }
    case ComponentType.RadioButtons: {
      return t('ux_editor.component_radio_button');
    }
    case ComponentType.Paragraph: {
      return t('ux_editor.component_paragraph');
    }
    case ComponentType.AddressComponent: {
      return t('ux_editor.component_advanced_address');
    }
    case ComponentType.Group: {
      return t('ux_editor.component_group');
    }
    case ComponentType.NavigationButtons: {
      return t('ux_editor.component_navigation_buttons');
    }
    case ComponentType.AttachmentList: {
      return t('ux_editor.component_attachment_list');
    }
    case ComponentType.NavigationBar: {
      return t('ux_editor.component_navigation_bar');
    }
    case ComponentType.Panel: {
      return t('ux_editor.component_information_panel');
    }
    case ComponentType.Map: {
      return t('ux_editor.component_map');
    }
    default: {
      return '';
    }
  }
}

export function getCollapsableMenuTitleByType(menu: CollapsableMenus, t: typeof i18next.t): string {
  switch (menu) {
    case CollapsableMenus.Components: {
      return t('ux_editor.collapsable_schema_components');
    }
    case CollapsableMenus.Texts: {
      return t('ux_editor.collapsable_text_components');
    }
    case CollapsableMenus.AdvancedComponents: {
      return t('ux_editor.collapsable_text_advanced_components');
    }
    case CollapsableMenus.Widgets: {
      return t('ux_editor.collapsable_text_widgets');
    }
    // case CollapsableMenus.ThirdParty: {
    //   return language['ux_editor.collapsable_text_thirdparty_components'];
    // }
    default: {
      return '';
    }
  }
}

export function truncate(s: string, size: number) {
  if (s && s.length > size) {
    return `${s.substring(0, size)}...`;
  }
  return s;
}

export function getTextResource(resourceKey: string, textResources: ITextResource[]): string {
  const textResource = textResources?.find((resource) => resource.id === resourceKey);
  return textResource ? textResource.value : resourceKey;
}
