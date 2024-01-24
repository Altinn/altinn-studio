import type { ITextResource } from 'app-shared/types/global';
import { CollapsableMenus } from '../types/global';
import type { ComponentType } from 'app-shared/types/ComponentType';
import type i18next from 'i18next';
import type { UseText } from '../hooks';
import type { TranslationKey } from 'app-shared/types/language';

/**
 * Get the help text for a given component type
 * @param type The component type
 * @param t The translation function
 * @returns The help text for the component, or the default help text if none is found
 */
export function getComponentHelperTextByComponentType(
  type: ComponentType,
  t: typeof i18next.t,
): string {
  const text = t(`ux_editor.component_help_text.${type}`);
  return text !== `ux_editor.component_help_text.${type}`
    ? text
    : t('ux_editor.component_help_text.default');
}

/**
 * Get the title text for a given component type
 * @param type The component type
 * @param t The translation function
 * @returns The title text for the component, or the type if none is found
 */
export function getComponentTitleByComponentType(type: ComponentType, t: typeof i18next.t): string {
  const text = t(`ux_editor.component_title.${type}`);
  return text !== `ux_editor.component_title.${type}` ? text : type;
}

export function getCollapsableMenuTitleByType(menu: CollapsableMenus, t: typeof i18next.t): string {
  switch (menu) {
    case CollapsableMenus.Components: {
      return t('ux_editor.collapsable_standard_components');
    }
    case CollapsableMenus.Texts: {
      return t('ux_editor.collapsable_text_components');
    }
    case CollapsableMenus.AdvancedComponents: {
      return t('ux_editor.collapsable_text_advanced_components');
    }
    // TODO : Uncomment when we have widgets components
    // case CollapsableMenus.Widgets: {
    //   return t('ux_editor.collapsable_text_widgets');
    // }
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
  if (!resourceKey || !textResources?.length) return;
  const textResource = textResources.find((resource) => resource.id === resourceKey);
  return textResource?.value;
}

export const getComponentPropertyLabel = (propertyKey: string, t: UseText): string => {
  const translationKey: string = `ux_editor.component_properties.${propertyKey}`;
  const translation = t(translationKey as TranslationKey);
  return translation === translationKey ? propertyKey : translation;
};
