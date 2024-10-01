import { getSelectedItemUtils } from './getSelectedItemUtils';
import type { DataModelMetadata } from 'app-shared/types/DataModelMetadata';
import {
  jsonMetadata1Mock,
  jsonMetadata2Mock,
  xsdMetadata1Mock,
  xsdMetadata2Mock,
} from '../../../../../packages/schema-editor/test/mocks/metadataMocks';
import { convertMetadataToOption } from '../../../../utils/metadataUtils';

describe('getSelectedItem', () => {
  it('Should search got selected item and find it', () => {
    const items: DataModelMetadata[] = [
      jsonMetadata1Mock,
      jsonMetadata2Mock,
      xsdMetadata1Mock,
      xsdMetadata2Mock,
    ];
    const item = convertMetadataToOption(jsonMetadata1Mock);
    expect(getSelectedItemUtils(items, item)).toEqual(item.value.repositoryRelativeUrl);
  });

  it('Should search got selected item and return undefined', () => {
    const items: DataModelMetadata[] = [jsonMetadata2Mock, xsdMetadata1Mock, xsdMetadata2Mock];
    const item = convertMetadataToOption(jsonMetadata1Mock);
    expect(getSelectedItemUtils(items, item)).toEqual(undefined);
  });
});
