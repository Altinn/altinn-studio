import type { StudioSuggestionItem } from '@studio/components';
import type { ValidateConfigState } from './ValidateNavigationTypes';
import { useComponentPropertyEnumValue } from '@altinn/ux-editor/hooks';

type ExternalConfigVariant1 = {
  show: string[];
  page: string;
};

type ExternalConfigVariant2 = ExternalConfigVariant1 & {
  tasks: string[];
};

type ExternalConfigVariant3 = ExternalConfigVariant1 & {
  task: string;
  pages: string[];
};

export function useConvertToInternalConfig(externalConfig: undefined): undefined;

export function useConvertToInternalConfig(
  externalConfig: ExternalConfigVariant1,
): ValidateConfigState;

export function useConvertToInternalConfig(
  externalConfig: ExternalConfigVariant2[] | ExternalConfigVariant3[],
): ValidateConfigState[];

export function useConvertToInternalConfig(
  externalConfig?: ExternalConfigVariant1 | ExternalConfigVariant2[] | ExternalConfigVariant3[],
): ValidateConfigState | ValidateConfigState[] | undefined {
  const enumLabel = useComponentPropertyEnumValue();

  const toOption = (v: string): StudioSuggestionItem => ({
    value: v,
    label: enumLabel(v),
  });

  const convert = (
    item: ExternalConfigVariant1 | ExternalConfigVariant2 | ExternalConfigVariant3,
  ): ValidateConfigState => ({
    types: item.show.map(toOption),
    pageScope: toOption(item.page),
    tasks: 'tasks' in item ? item.tasks.map(toOption) : undefined,
    task: 'task' in item ? toOption(item.task) : undefined,
    pages: 'pages' in item ? item.pages.map(toOption) : undefined,
  });

  if (!externalConfig) return;

  return Array.isArray(externalConfig) ? externalConfig.map(convert) : convert(externalConfig);
}
