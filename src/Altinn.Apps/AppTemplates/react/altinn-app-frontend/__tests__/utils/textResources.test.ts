import 'jest';
import { ITextResource } from '../../src/types';
import { getTextResourceByKey } from '../../src/utils/textResource';

describe('>>> /utils/textResource.ts', () => {
  let mockTextResources: ITextResource[];
  let mockKey: string;
  let mockInvalidKey: string;
  beforeEach(() => {
    mockTextResources = [{
      id: 'mockId1', value: 'mock value 1', unparsedValue: 'mock value 1', variables: undefined,
    }, {
      id: 'mockId2', value: 'mock value 2', unparsedValue: 'mock value 2', variables: undefined,
    }];
    mockKey = 'mockId1';
    mockInvalidKey = 'invalid';
  });

  it('+++ should return correct value for a given key', () => {
    const result = getTextResourceByKey(mockKey, mockTextResources);
    expect(result).toBe(mockTextResources[0].value);
  });

  it('+++ should return the key if a value does not exist for the given key', () => {
    const result = getTextResourceByKey(mockInvalidKey, mockTextResources);
    expect(result).toBe(mockInvalidKey);
  });

  it('+++ should return key if mockTextResources are null', () => {
    const result = getTextResourceByKey(mockKey, null);
    expect(result).toBe(mockKey);
  });
});
