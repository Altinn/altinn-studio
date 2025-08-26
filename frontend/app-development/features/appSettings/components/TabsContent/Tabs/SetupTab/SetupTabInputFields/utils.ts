import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';
import { ObjectUtils } from '@studio/pure-functions';

export const onEntryShowKey = 'select-instance';

export function updateOnEntryShow(
  metadata: ApplicationMetadata,
  value: boolean,
): ApplicationMetadata {
  return value ? enableOnEntryShow(metadata) : disableOnEntryShow(metadata);
}

function enableOnEntryShow(metadata: ApplicationMetadata): ApplicationMetadata {
  return {
    ...metadata,
    onEntry: {
      ...metadata.onEntry,
      show: onEntryShowKey,
    },
  };
}

function disableOnEntryShow(metadata: ApplicationMetadata): ApplicationMetadata {
  const newMetadata = ObjectUtils.deepCopy(metadata);
  if (newMetadata.onEntry) {
    delete newMetadata.onEntry;
  }
  return newMetadata;
}
