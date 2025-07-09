import type { LabelAndValue } from 'app-development/features/appSettings/types/LabelAndValue';
import type { TranslationFunction } from 'app-development/features/appSettings/types/Translation';
import type { AvailableForTypeOption } from 'app-shared/types/AppConfig';

export function getAvailableForTypeOptions(
  translationFunction: TranslationFunction,
): LabelAndValue[] {
  const availableForTypeOptionKeys: string[] = getAvailableForTypeMapKeys();
  const availableForTypeOptions: LabelAndValue[] = mapAvailableForTypeKeyToValueAndLabel(
    availableForTypeOptionKeys,
    translationFunction,
  );
  return availableForTypeOptions;
}

function getAvailableForTypeMapKeys(): string[] {
  return Object.keys(availableForTypeMap);
}

function mapAvailableForTypeKeyToValueAndLabel(
  keys: string[],
  translationFunction: TranslationFunction,
): LabelAndValue[] {
  return keys.map((key: string) => ({
    value: key,
    label: translationFunction(availableForTypeMap[key]),
  }));
}

export const availableForTypeMap: Record<AvailableForTypeOption, string> = {
  PrivatePerson: 'app_settings.about_tab_available_for_type_private',
  LegalEntityEnterprise: 'app_settings.about_tab_available_for_type_legal',
  Company: 'app_settings.about_tab_available_for_type_company',
  BankruptcyEstate: 'app_settings.about_tab_available_for_type_bankruptcy',
  SelfRegisteredUser: 'app_settings.about_tab_available_for_type_self_registered',
};
