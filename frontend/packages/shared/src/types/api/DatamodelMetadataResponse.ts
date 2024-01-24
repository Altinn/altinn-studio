import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { DatamodelFieldElement } from 'app-shared/types/DatamodelFieldElement';

export interface DatamodelMetadataResponse {
  elements: KeyValuePairs<DatamodelFieldElement>;
}
