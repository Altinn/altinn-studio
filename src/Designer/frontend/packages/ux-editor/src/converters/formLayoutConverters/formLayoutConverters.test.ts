import { externalLayoutToInternal } from './externalLayoutToInternal';
import {
  externalLayoutWithMultiPageGroup,
  internalLayoutWithMultiPageGroup,
} from '../../testing/layoutWithMultiPageGroupMocks';
import { internalLayoutToExternal } from './internalLayoutToExternal';
import type { SerializedFormLayout } from '../../types/SerializedComponent';
import { layoutSchemaUrl } from 'app-shared/cdn-paths';

describe('formLayoutConverters', () => {
  test('Internal layout remains the same when converted to en external layout and back', () => {
    const convertedToExternal = internalLayoutToExternal(internalLayoutWithMultiPageGroup);
    const convertedBack = externalLayoutToInternal(convertedToExternal);
    expect(convertedBack).toEqual(internalLayoutWithMultiPageGroup);
  });

  test('External layout that is already converted once remains the same when converted to an internal layout and back', () => {
    const convertToInternalAndBack = (layout: SerializedFormLayout) =>
      internalLayoutToExternal(externalLayoutToInternal(layout));
    const convertedOnce = convertToInternalAndBack(externalLayoutWithMultiPageGroup);
    const convertedTwice = convertToInternalAndBack(convertedOnce);
    expect(convertedTwice).toEqual(convertedOnce);
  });

  test('Preserves expressions and unknown properties while normalizing raw data-model bindings', () => {
    const layout: SerializedFormLayout = {
      $schema: layoutSchemaUrl(),
      data: {
        layout: [
          {
            id: 'alert',
            type: 'Alert',
            severity: 'info',
            textResourceBindings: { title: ['concat', 'Plain ', 'text'] },
            futureProperty: { nested: true },
          },
          {
            id: 'map',
            type: 'Map',
            dataModelBindings: { simpleBinding: 'location' },
          },
        ],
      },
    };

    const roundTripped = internalLayoutToExternal(externalLayoutToInternal(layout, 'model'));

    expect(roundTripped.data.layout).toEqual([
      expect.objectContaining({
        id: 'alert',
        textResourceBindings: { title: ['concat', 'Plain ', 'text'] },
        futureProperty: { nested: true },
      }),
      expect.objectContaining({
        id: 'map',
        dataModelBindings: { simpleBinding: { dataType: 'model', field: 'location' } },
      }),
    ]);
  });
});
