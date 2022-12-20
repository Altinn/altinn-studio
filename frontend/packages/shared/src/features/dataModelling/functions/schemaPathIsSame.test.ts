import { schemaPathIsSame } from './schemaPathIsSame';
import type { IMetadataOption } from 'app-shared/features/dataModelling/functions/types';

describe('schemaPathIsSame', () => {
  const something: IMetadataOption = {
    label: 'something',
    value: {
      repositoryRelativeUrl: '/some/relative/path/to/something.schema.json',
      fileName: 'something.schema.json',
      fileType: '.json',
    },
  };
  const somethingElse: IMetadataOption = {
    label: 'somethingElse',
    value: {
      repositoryRelativeUrl: '/some/relative/path/to/somethingElse.schema.json',
      fileName: 'somethingElse.schema.json',
      fileType: '.json',
    },
  };

  it('should return true if there is nothing in the second argument', () => {
    expect(schemaPathIsSame(null, null)).toBe(true);
    expect(schemaPathIsSame(something, null)).toBe(true);
    expect(schemaPathIsSame(null, undefined)).toBe(true);
    expect(schemaPathIsSame(something, undefined)).toBe(true);
  });

  it('should return true if both arguments have the same path', () => {
    expect(schemaPathIsSame(something, something)).toBe(true);
  });

  it('should return false if there is a path in the second argument', () => {
    expect(schemaPathIsSame(null, somethingElse)).toBe(false);
    expect(schemaPathIsSame(undefined, somethingElse)).toBe(false);
  });

  it('should return false if there paths are different', () => {
    expect(schemaPathIsSame(something, somethingElse)).toBe(false);
  });
});
