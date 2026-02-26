import type { StudioSuggestionItem } from '@studio/components';
import type { ExternalConfigState, InternalConfigState } from './ValidateNavigationTypes';
import { useComponentPropertyEnumValue } from '@altinn/ux-editor/hooks';

export function useConvertToInternalConfig(externalConfig: undefined): undefined;

export function useConvertToInternalConfig(
  externalConfig: ExternalConfigState,
): InternalConfigState;

export function useConvertToInternalConfig(
  externalConfig: ExternalConfigState[],
): InternalConfigState[];

export function useConvertToInternalConfig(
  externalConfig?: ExternalConfigState | ExternalConfigState[],
): InternalConfigState | InternalConfigState[] | undefined {
  const enumLabel = useComponentPropertyEnumValue();

  const toOption = (value: string): StudioSuggestionItem => ({
    value: value,
    label: enumLabel(value),
  });

  const convert = (item: ExternalConfigState): InternalConfigState => ({
    types: item.show.map(toOption),
    pageScope: toOption(item.page),
    tasks: item.tasks?.map(toOption),
    task: item.task ? toOption(item.task) : undefined,
    pages: item.pages?.map(toOption),
  });

  if (!externalConfig) return undefined;

  return Array.isArray(externalConfig) ? externalConfig.map(convert) : convert(externalConfig);
}
