import type { ITextResource } from 'app-shared/types/global';
import { CollapsableMenus } from '../types/global';
import { FormItemType } from 'app-shared/types/FormItemType';
import i18next from 'i18next';

export function getComponentHelperTextByComponentType(type: FormItemType, language: any): string {
  switch (type) {
    case FormItemType.Header: {
      return language['ux_editor.helper_text_for_header'];
    }
    case FormItemType.Input: {
      return language['ux_editor.helper_text_for_input'];
    }
    case FormItemType.Checkboxes: {
      return language['ux_editor.helper_text_for_check_box'];
    }
    case FormItemType.RadioButtons: {
      return language['ux_editor.helper_text_for_radio_button'];
    }
    case FormItemType.Image: {
      return language['ux_editor.helper_text_for_image'];
    }
    case FormItemType.AttachmentList: {
      return language['ux_editor.helper_text_for_attachment_list'];
    }
    case FormItemType.Button: {
      return language['ux_editor.helper_text_for_attachment_button'];
    }
    case FormItemType.NavigationBar: {
      return language['ux_editor.helper_text_for_nav_bar'];
    }
    default: {
      // Several components does not yet have a helper text, a default is shown.
      return language['ux_editor.helper_text_default'];
    }
  }
}

export function getComponentTitleByComponentType(type: FormItemType, t: typeof i18next.t): string {
  switch (type) {
    case FormItemType.Checkboxes: {
      return t('ux_editor.component_checkbox');
    }
    case FormItemType.Dropdown: {
      return t('ux_editor.component_dropdown');
    }
    case FormItemType.FileUpload: {
      return t('ux_editor.component_file_upload');
    }
    case FormItemType.FileUploadWithTag: {
      return t('ux_editor.component_file_upload_with_tag');
    }
    case FormItemType.Header: {
      return t('ux_editor.component_header');
    }
    case FormItemType.Input: {
      return t('ux_editor.component_input');
    }
    case FormItemType.Image: {
      return t('ux_editor.component_image');
    }
    case FormItemType.Datepicker: {
      return t('ux_editor.component_datepicker');
    }
    case FormItemType.Button: {
      return t('ux_editor.component_button');
    }
    case FormItemType.TextArea: {
      return t('ux_editor.component_text_area');
    }
    case FormItemType.RadioButtons: {
      return t('ux_editor.component_radio_button');
    }
    case FormItemType.Paragraph: {
      return t('ux_editor.component_paragraph');
    }
    case FormItemType.AddressComponent: {
      return t('ux_editor.component_advanced_address');
    }
    case FormItemType.Group: {
      return t('ux_editor.component_group');
    }
    case FormItemType.NavigationButtons: {
      return t('ux_editor.component_navigation_buttons');
    }
    case FormItemType.AttachmentList: {
      return t('ux_editor.component_attachment_list');
    }
    case FormItemType.NavigationBar: {
      return t('ux_editor.component_navigation_bar');
    }
    case FormItemType.Panel: {
      return t('ux_editor.component_information_panel');
    }
    case FormItemType.Map: {
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
