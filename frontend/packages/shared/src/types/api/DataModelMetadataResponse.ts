import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { DataModelFieldElement } from 'app-shared/types/DataModelFieldElement';

export interface DataModelMetadataResponse {
  elements: KeyValuePairs<DataModelFieldElement>;
}
