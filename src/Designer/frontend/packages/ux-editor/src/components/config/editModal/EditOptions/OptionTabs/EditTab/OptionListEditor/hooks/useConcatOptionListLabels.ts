import type { Option } from 'app-shared/types/Option';
import type { TextResource } from '@studio/components-legacy';
import { ArrayUtils } from 'libs/studio-pure-functions/src';
import { useTranslation } from 'react-i18next';

export function useConcatOptionListLabels(
  optionList: Option[],
  textResources?: TextResource[],
): string {
  const { t } = useTranslation();
  const emptyStringText = t('general.empty_string');
  return concatOptionLabels(optionList, emptyStringText, textResources);
}

function concatOptionLabels(
  optionList: Option[],
  emptyStringText: string,
  textResources?: TextResource[],
): string {
  const optionLabels: string[] = extractLabels(optionList);
  const texts = retrieveLabelTexts(optionLabels, emptyStringText, textResources);
  return labelListToString(texts);
}

function extractLabels(optionList: Option[]): string[] {
  return ArrayUtils.mapByKey<Option, 'label'>(optionList, 'label');
}

function retrieveLabelTexts(
  labels: string[],
  emptyStringText: string,
  textResources?: TextResource[],
): string[] {
  if (!textResources) return labels;
  const textResourceMap = convertTextResourcesIntoMap(textResources);
  return mapIdsToText(labels, textResourceMap, emptyStringText);
}

function convertTextResourcesIntoMap(textResources: TextResource[]): Map<string, string> {
  return new Map<string, string>(
    textResources.map((resource: TextResource) => [resource.id, resource.value]),
  );
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
