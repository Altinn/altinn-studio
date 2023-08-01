import { schemaPathIsSame } from './schemaPathIsSame';
import { MetadataOption } from '@altinn/schema-editor/types/MetadataOption';

describe('schemaPathIsSame', () => {
  const something: MetadataOption = {
    label: 'something',
    value: {
      description: null,
      directory: 'some/relative/path/to',
      fileName: 'something.schema.json',
      filePath: '/some/relative/path/to/something.schema.json',
      fileStatus: 'Default',
      fileType: '.json',
      lastChanged: '2021-09-09T12:00:00',
      repositoryRelativeUrl: '/some/relative/path/to/something.schema.json',
    },
  };
  const somethingElse: MetadataOption = {
    label: 'somethingElse',
    value: {
      description: null,
      directory: 'some/relative/path/to',
      fileName: 'somethingElse.schema.json',
      filePath: '/some/relative/path/to/somethingElse.schema.json',
      fileStatus: 'Default',
      fileType: '.json',
      lastChanged: '2021-09-09T12:00:00',
      repositoryRelativeUrl: '/some/relative/path/to/somethingElse.schema.json',
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
