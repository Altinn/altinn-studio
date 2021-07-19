import { IMetadataOption } from './types';

function findPreferedMetadataOption(metadataOptions: IMetadataOption[], prefered?: string) {
  if (!metadataOptions?.length || !prefered) {
    return undefined;
  }
  return metadataOptions.find(({ label }) => label === prefered);
}

export default findPreferedMetadataOption;
