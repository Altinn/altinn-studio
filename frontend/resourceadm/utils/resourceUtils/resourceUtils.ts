import { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { LeftNavigationTab } from 'app-shared/types/LeftNavigationTab';
import type {
  SupportedLanguageKey,
  ResourceTypeOption,
  ResourceStatusOption,
  ResourceAvailableForTypeOption,
  ResourceKeyword,
} from 'app-shared/types/ResourceAdm';
import { ReactNode } from 'react';
import { NavigationBarPage, SupportedLanguage } from 'resourceadm/types/global';

/**
 * The map of resource type
 */
export const resourceTypeMap: Record<ResourceTypeOption, string> = {
  GenericAccessResource: 'resourceadm.about_resource_resource_type_generic_access_resource',
  Systemresource: 'resourceadm.about_resource_resource_type_system_resource',
  MaskinportenSchema: 'resourceadm.about_resource_resource_type_maskinporten',
};

/**
 * The map of resource status
 */
export const resourceStatusMap: Record<ResourceStatusOption, string> = {
  Completed: 'resourceadm.about_resource_status_completed',
  Deprecated: 'resourceadm.about_resource_status_deprecated',
  UnderDevelopment: 'resourceadm.about_resource_status_under_development',
  Withdrawn: 'resourceadm.about_resource_status_withdrawn',
};

/**
 * The map of resource status
 */
export const availableForTypeMap: Record<ResourceAvailableForTypeOption, string> = {
  PrivatePerson: 'resourceadm.about_resource_available_for_type_private',
  LegalEntityEnterprise: 'resourceadm.about_resource_available_for_type_legal',
  Company: 'resourceadm.about_resource_available_for_type_company',
  BankruptcyEstate: 'resourceadm.about_resource_available_for_type_bankruptcy',
  SelfRegisteredUser: 'resourceadm.about_resource_available_for_type_self_registered',
};

/**
 * Returns true if the text is either null, undefined, or at least one of the
 * laguage fields are empty.
 *
 * @param text the text to check
 *
 * @returns boolean for if it has error or not
 */
export const getResourcePageTextfieldError = (text: SupportedLanguageKey<string>): boolean =>
  text === undefined || text === null || text.nb === '' || text.nn === '' || text.en === '';

/**
 * Converts the resource type key to the correct displayable string
 *
 * @param resourceType the resourcetype to convert
 *
 * @returns the string to display
 */
export const convertResourceTypeToDisplayString = (resourceType: ResourceTypeOption): string => {
  return resourceTypeMap[resourceType];
};

/**
 * Maps the language key to the text
 */
export const mapLanguageKeyToLanguageText = (
  val: 'nb' | 'nn' | 'en',
  translationFunction: (key: string, params?: object) => string
) => {
  if (val === 'nb') return translationFunction('language.nb');
  if (val === 'nn') return translationFunction('language.nn');
  return translationFunction('language.en');
};

/**
 * Gets the correct text to display for input fields with missing value
 *
 * @param language the value
 * @param usageString the type of the field
 * @param translationFunction the translation function
 */
export const getMissingInputLanguageString = (
  language: SupportedLanguage,
  usageString: string,
  translationFunction: (key: string, params?: KeyValuePairs<string>) => string
): string => {
  const valArr: ('nb' | 'nn' | 'en')[] = [];

  // Add the different languages
  if (language.nb === '') {
    valArr.push('nb');
  }
  if (language.nn === '') {
    valArr.push('nn');
  }
  if (language.en === '') {
    valArr.push('en');
  }

  // Return different messages based on the length
  if (valArr.length === 1) {
    return translationFunction('resourceadm.about_resource_langauge_error_missing_1', {
      usageString,
      lang: mapLanguageKeyToLanguageText(valArr[0], translationFunction),
    });
  }
  if (valArr.length === 2) {
    return translationFunction('resourceadm.about_resource_langauge_error_missing_2', {
      usageString,
      lang1: mapLanguageKeyToLanguageText(valArr[0], translationFunction),
      lang2: mapLanguageKeyToLanguageText(valArr[1], translationFunction),
    });
  }
  if (valArr.length === 3) {
    return translationFunction('resourceadm.about_resource_langauge_error_missing_3', {
      usageString,
      lang1: mapLanguageKeyToLanguageText(valArr[0], translationFunction),
      lang2: mapLanguageKeyToLanguageText(valArr[1], translationFunction),
      lang3: mapLanguageKeyToLanguageText(valArr[2], translationFunction),
    });
  }
  return '';
};

/**
 * ------------ Temporary functions -------------
 * The first one maps keyword to string, and the second from string to keyword
 *
 * TODO - Find out how to handle it in the future
 */
export const mapKeywordsArrayToString = (resourceKeywords: ResourceKeyword[]): string => {
  return resourceKeywords.map((k) => k.word).join(', ');
};
export const mapKeywordStringToKeywordTypeArray = (keywrodString: string): ResourceKeyword[] => {
  return keywrodString.split(', ').map((val) => ({ language: 'nb', word: val.trim() }));
};

/**
 * Gets the status for if a tab is active or not based on the
 * current page and the tabs id.
 *
 * @param currentPage the currently selected tab
 * @param tabId the id of the tab to check
 *
 * @returns if the tab is active or not
 */
export const getIsActiveTab = (currentPage: NavigationBarPage, tabId: string): boolean => {
  return currentPage === tabId;
};

/**
 * Creates a new navigation tab to be used in the LeftNavigationBar
 *
 * @param icon the icon to display
 * @param tabId the id of the tab
 * @param onClick function to be executed on click
 * @param currentPage the current selected page
 * @param to where to navigate to
 *
 * @returns a LeftNavigationTab
 */
export const createNavigationTab = (
  icon: ReactNode,
  tabId: string,
  onClick: (tabId: string) => void,
  currentPage: NavigationBarPage,
  to: string
): LeftNavigationTab => {
  return {
    icon,
    tabName: `resourceadm.left_nav_bar_${tabId}`,
    tabId,
    action: {
      type: 'link',
      onClick,
      to,
    },
    isActiveTab: getIsActiveTab(currentPage, tabId),
  };
};
