import { SimpleSubexpressionValueType } from '../../../../../enums/SimpleSubexpressionValueType';
import { getDefaultValueOfType } from './getDefaultValueOfType';

describe('getDefaultValueOfType', () => {
  it.each(Object.values(SimpleSubexpressionValueType))(
    'Returns a value of the given type when the type is %s',
    (type) => {
      const result = getDefaultValueOfType(type);
      expect(result.type).toBe(type);
    },
  );
});
