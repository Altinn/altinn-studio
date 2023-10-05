import { externalLayoutToInternal } from './externalLayoutToInternal';
import { complexExternalLayout, complexInternalLayout } from '../../testing/complexLayoutMocks';
import { internalLayoutToExternal } from './internalLayoutToExternal';
import { ExternalFormLayout } from 'app-shared/types/api';

describe('formLayoutConverters', () => {
  test('Internal layout remains the same when converted to en external layout and back', () => {
    const convertedToExternal = internalLayoutToExternal(complexInternalLayout);
    const convertedBack = externalLayoutToInternal(convertedToExternal);
    expect(convertedBack).toEqual(complexInternalLayout);
  });

  test('External layout that is already converted once remains the same when converted to an internal layout and back', () => {
    const convertToInternalAndBack = (layout: ExternalFormLayout) =>
      internalLayoutToExternal(externalLayoutToInternal(layout));
    const convertedOnce = convertToInternalAndBack(complexExternalLayout);
    const convertedTwice = convertToInternalAndBack(convertedOnce);
    expect(convertedTwice).toEqual(convertedOnce);
  });
});
