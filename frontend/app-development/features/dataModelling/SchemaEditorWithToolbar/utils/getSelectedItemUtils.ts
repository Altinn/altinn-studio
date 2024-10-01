import type { DataModelMetadata } from 'app-shared/types/DataModelMetadata';
import type { MetadataOption } from '../../../../types/MetadataOption';

/**
 * Calculates the dragged item's new index and parent ID when it is dropped.
 * Searches for selected item in array.
 * @param dataModels The array being searched within.
 * @param selectedOption The target item (the one which the dragged item is being dropped on)
 * @returns repositoryRelativeUrl | null
 */
export function getSelectedItem(
  dataModels: DataModelMetadata[],
  selectedOption: MetadataOption,
): string | undefined {
  return dataModels.find(
    (item) => item.repositoryRelativeUrl === selectedOption?.value.repositoryRelativeUrl,
  )?.repositoryRelativeUrl;
}
