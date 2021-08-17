import { IMetadataOption } from './types';

function findPreferredMetadataOption(metadataOptions: IMetadataOption[], preferred?: string) {
  if (!metadataOptions?.length || !preferred) {
    return undefined;
  }
  return metadataOptions.find(({ label }) => label === preferred);
}

export default findPreferredMetadataOption;
