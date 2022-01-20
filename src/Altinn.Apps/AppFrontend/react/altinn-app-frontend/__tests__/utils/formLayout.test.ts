import { IMapping } from '../../src/types';
import { setMappingForRepeatingGroupComponent } from '../../src/utils/formLayout';

describe('setMappingForRepeatingGroupComponent', () => {
  it('should replace indexed mapping with the current index', () => {
    const mapping: IMapping = {
      'some.group[{0}].field1': 'mappedGroupField1',
      'some.group[{0}].field2': 'mappedGroupField2',
      'some.regular.field': 'mappedRegularField'
    };
    const expectedResult: IMapping = {
      'some.group[2].field1': 'mappedGroupField1',
      'some.group[2].field2': 'mappedGroupField2',
      'some.regular.field': 'mappedRegularField'
    }
    const result = setMappingForRepeatingGroupComponent(mapping, 2);
    expect(result).toEqual(expectedResult);
  });
});
