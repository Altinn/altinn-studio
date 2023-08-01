import { MetadataOption } from '@altinn/schema-editor/types/MetadataOption';
import { MetadataOptionsGroup } from '@altinn/schema-editor/types/MetadataOptionsGroup';

export const findPreferredMetadataOption = (
  groupedMetaData: MetadataOptionsGroup[],
  preferred?: string
): MetadataOption => {
  if (!groupedMetaData.length || !preferred) return;

  const metadataOptions = getOptionsFromGroupedMetaData(groupedMetaData);

  if (!metadataOptions.length) return;

  return metadataOptions.find(({ label }) => label === preferred);
};

const getOptionsFromGroupedMetaData = (groupedMetaData: MetadataOptionsGroup[]): MetadataOption[] => {
  return groupedMetaData.map(({ options }) => options).flat();
};
