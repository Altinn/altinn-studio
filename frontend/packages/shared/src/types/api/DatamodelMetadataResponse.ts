import { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { DatamodelFieldElement } from 'app-shared/types/DatamodelFieldElement';

export interface DatamodelMetadataResponse {
  elements: KeyValuePairs<DatamodelFieldElement>;
}
