import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { LeftNavigationTab } from 'app-shared/types/LeftNavigationTab';
import type {
  ResourceTypeOption,
  ResourceStatusOption,
  ResourceAvailableForTypeOption,
  ResourceKeyword,
  ValidLanguage,
  SupportedLanguage,
} from 'app-shared/types/ResourceAdm';
import type { ReactNode } from 'react';
import type { NavigationBarPage } from '../../types/NavigationBarPage';

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

export type EnvId = 'tt02' | 'prod' | 'at22' | 'at23';
export type EnvType = 'test' | 'prod';
export const getAvailableEnvironments = (
  org: string,
): {
  id: EnvId;
  label: string;
  envType: EnvType;
}[] => {
  const availableEnvs = [
    {
      id: 'tt02' as EnvId,
      label: 'resourceadm.deploy_test_env',
      envType: 'test' as EnvType,
    },
    {
      id: 'prod' as EnvId,
      label: 'resourceadm.deploy_prod_env',
      envType: 'prod' as EnvType,
    },
  ];
  if (org === 'ttd') {
    availableEnvs.push(
      {
        id: 'at22' as EnvId,
        label: 'resourceadm.deploy_at22_env',
        envType: 'test' as EnvType,
      },
      {
        id: 'at23' as EnvId,
        label: 'resourceadm.deploy_at23_env',
        envType: 'test' as EnvType,
      },
    );
  }
  return availableEnvs;
};

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
  val: ValidLanguage,
  translationFunction: (key: string) => string,
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
  translationFunction: (key: string, params?: KeyValuePairs<string>) => string,
): string => {
  const supportedLanguages: ValidLanguage[] = ['nb', 'nn', 'en'];
  const missingLanguages = supportedLanguages.filter((lang) => !language[lang]);

  // Return different messages based on the length
  if (missingLanguages.length === 1) {
    return translationFunction('resourceadm.about_resource_langauge_error_missing_1', {
      usageString,
      lang: mapLanguageKeyToLanguageText(missingLanguages[0], translationFunction),
    });
  } else if (missingLanguages.length > 1) {
    const lastLang = missingLanguages.pop();
    return translationFunction('resourceadm.about_resource_langauge_error_missing_2', {
      usageString,
      lang1: missingLanguages
        .map((lang) => mapLanguageKeyToLanguageText(lang, translationFunction))
        .join(', '),
      lang2: mapLanguageKeyToLanguageText(lastLang, translationFunction),
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
  return keywrodString
    .split(',')
    .filter(Boolean)
    .map((val) => ({ language: 'nb', word: val.trim() }));
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
  to: string,
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
