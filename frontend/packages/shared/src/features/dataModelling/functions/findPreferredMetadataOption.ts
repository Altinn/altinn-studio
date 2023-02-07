import { GroupedOption } from '../components/SchemaSelect';
import type { IMetadataOption } from './types';

export const findPreferredMetadataOption = (
  groupedMetaData: GroupedOption[],
  preferred?: string
): IMetadataOption => {
  if (!groupedMetaData.length || !preferred) return;

  const metadataOptions = getOptionsFromGroupedMetaData(groupedMetaData);

  if (!metadataOptions.length) return;

  const preferredMetadataOption = metadataOptions.find(({ label }) => label === preferred);
  return preferredMetadataOption;
};

const getOptionsFromGroupedMetaData = (groupedMetaData: GroupedOption[]): IMetadataOption[] => {
  return groupedMetaData.map(({ options }) => options).flat();
};
