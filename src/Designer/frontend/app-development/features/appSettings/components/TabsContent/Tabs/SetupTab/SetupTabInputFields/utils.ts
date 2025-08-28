import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';

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
      ...(metadata.onEntry ?? {}),
      show: onEntryShowKey,
    },
  };
}

function disableOnEntryShow(metadata: ApplicationMetadata): ApplicationMetadata {
  const { onEntry, ...rest } = metadata;
  return rest;
}
