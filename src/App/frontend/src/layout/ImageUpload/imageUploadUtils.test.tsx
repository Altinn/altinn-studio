import { isAllowedContentTypesValid } from 'src/layout/ImageUpload/imageUploadUtils';
import { IDataType } from 'src/types/shared';

describe('isAllowedContentTypesValid', () => {
  const dataTypes: IDataType[] = [
    { id: 'comp1', allowedContentTypes: null, maxCount: 1, minCount: 1 },
    { id: 'comp2', allowedContentTypes: ['image/png'], maxCount: 1, minCount: 1 },
    { id: 'comp3', allowedContentTypes: ['image/jpeg'], maxCount: 1, minCount: 1 },
  ];

  it('returns true when allowedContentTypes is empty', () => {
    expect(isAllowedContentTypesValid({ baseComponentId: 'comp1', dataTypes })).toBe(true);
  });
  it('returns true when allowedContentTypes includes image/png', () => {
    expect(isAllowedContentTypesValid({ baseComponentId: 'comp2', dataTypes })).toBe(true);
  });
  it('returns false when allowedContentTypes does not include image/png', () => {
    expect(isAllowedContentTypesValid({ baseComponentId: 'comp3', dataTypes })).toBe(false);
  });
});
