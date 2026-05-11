import { externalLayoutToInternal } from './externalLayoutToInternal';
import {
  externalLayoutWithMultiPageGroup,
  internalLayoutWithMultiPageGroup,
} from '../../testing/layoutWithMultiPageGroupMocks';
import { internalLayoutToExternal } from './internalLayoutToExternal';
import type { ExternalFormLayout } from 'app-shared/types/api';

describe('formLayoutConverters', () => {
  test('Internal layout remains the same when converted to en external layout and back', () => {
    const convertedToExternal = internalLayoutToExternal(internalLayoutWithMultiPageGroup);
    const convertedBack = externalLayoutToInternal(convertedToExternal);
    expect(convertedBack).toEqual(internalLayoutWithMultiPageGroup);
  });

  test('External layout that is already converted once remains the same when converted to an internal layout and back', () => {
    const convertToInternalAndBack = (layout: ExternalFormLayout) =>
      internalLayoutToExternal(externalLayoutToInternal(layout));
    const convertedOnce = convertToInternalAndBack(externalLayoutWithMultiPageGroup);
    const convertedTwice = convertToInternalAndBack(convertedOnce);
    expect(convertedTwice).toEqual(convertedOnce);
  });
});
