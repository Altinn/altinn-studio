import type { Option } from 'app-shared/types/Option';
import type { TextResource } from '@studio/components-legacy';
import { ArrayUtils } from '@studio/pure-functions';
import { useTranslation } from 'react-i18next';

export function useConcatOptionListLabels(
  optionList: Option[],
  textResources?: TextResource[],
): string {
  const { t } = useTranslation();
  const emptyStringText = t('general.empty_string');
  return concatOptionLabels(optionList, textResources, emptyStringText);
}

function concatOptionLabels(
  optionList: Option[],
  textResources: TextResource[],
  emptyStringText: string,
): string {
  const optionLabels: string[] = extractLabels(optionList);
  const textResourceMap: Map<string, string> = convertTextResourcesIntoMap(textResources);
  const texts = retrieveLabelTexts(optionLabels, textResourceMap, emptyStringText);

  return labelListToString(texts);
}

function extractLabels(optionList: Option[]): string[] {
  return ArrayUtils.mapByKey<Option, 'label'>(optionList, 'label');
}

function convertTextResourcesIntoMap(textResources: TextResource[]): Map<string, string> {
  if (!textResources) return undefined;
  return new Map<string, string>(
    textResources.map((resource: TextResource) => [resource.id, resource.value]) ?? [],
  );
}

function retrieveLabelTexts(
  labels: string[],
  textResourceMap: Map<string, string>,
  emptyStringText: string,
): string[] {
  if (!textResourceMap) return labels;
  return mapIdsToText(labels, textResourceMap, emptyStringText);
}

function mapIdsToText(
  ids: string[],
  textResourceMap: Map<string, string>,
  emptyStringText: string,
): string[] {
  return ids.map((label) => (textResourceMap.get(label) ?? label) || emptyStringText);
}

function labelListToString(labelList: string[]): string {
  return labelList.join(labelDelimiter);
}
const labelDelimiter = ' | ';
