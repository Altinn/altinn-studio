import type { IMetadataOption } from './types';

export function findPreferredMetadataOption(
  metadataOptions: IMetadataOption[],
  preferred?: string
) {
  if (!metadataOptions?.length || !preferred) {
    return undefined;
  }
  return metadataOptions.find(({ label }) => label === preferred);
}
