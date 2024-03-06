import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { DatamodelFieldElement } from 'app-shared/types/DatamodelFieldElement';

export type DataodelMetadataResponse = DatamodelMetadataLowerCased | DataModelMetadataUpperCased;

interface DatamodelMetadataLowerCased {
  elements: KeyValuePairs<DatamodelFieldElement>;
}

interface DataModelMetadataUpperCased {
  Elements: KeyValuePairs<DatamodelFieldElement>;
}
