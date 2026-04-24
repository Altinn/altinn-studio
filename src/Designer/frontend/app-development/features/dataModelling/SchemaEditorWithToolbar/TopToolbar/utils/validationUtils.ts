import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';

export const extractDataTypeNamesFromAppMetadata = (
  appMetadata?: ApplicationMetadata,
): string[] => {
  return appMetadata?.dataTypes?.map((dataType) => dataType.id) || [];
};
