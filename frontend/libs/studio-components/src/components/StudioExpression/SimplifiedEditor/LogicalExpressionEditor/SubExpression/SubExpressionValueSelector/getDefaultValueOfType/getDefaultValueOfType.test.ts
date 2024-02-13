import { SimpleSubExpressionValueType } from '../../../../../enums/SimpleSubExpressionValueType';
import { getDefaultValueOfType } from './getDefaultValueOfType';

describe('getDefaultValueOfType', () => {
  it.each(Object.values(SimpleSubExpressionValueType))(
    'Returns a value of the given type when the type is %s',
    (type) => {
      const result = getDefaultValueOfType(type);
      expect(result.type).toBe(type);
    },
  );
});
