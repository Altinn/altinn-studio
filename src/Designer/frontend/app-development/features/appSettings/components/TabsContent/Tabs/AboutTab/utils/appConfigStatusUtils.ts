import type { LabelAndValue } from '../../../../../types/LabelAndValue';
import type { TranslationFunction } from '../../../../../types/Translation';
import type { StatusOption } from 'app-shared/types/AppConfig';

export function getStatusOptions(translationFunction: TranslationFunction): LabelAndValue[] {
  const statusOptionKeys: string[] = getStatusMapKeys();
  const statusOptions: LabelAndValue[] = mapStatusKeyToValueAndLabel(
    statusOptionKeys,
    translationFunction,
  );
  return statusOptions;
}

function getStatusMapKeys(): string[] {
  return Object.keys(statusMap);
}

function mapStatusKeyToValueAndLabel(
  keys: string[],
  translationFunction: TranslationFunction,
): LabelAndValue[] {
  return keys.map((key: string) => ({
    value: key,
    label: translationFunction(statusMap[key]),
  }));
}

export const statusMap: Record<StatusOption, string> = {
  Completed: 'app_settings.about_tab_status_completed',
  Deprecated: 'app_settings.about_tab_status_deprecated',
  UnderDevelopment: 'app_settings.about_tab_status_under_development',
  Withdrawn: 'app_settings.about_tab_status_withdrawn',
};
