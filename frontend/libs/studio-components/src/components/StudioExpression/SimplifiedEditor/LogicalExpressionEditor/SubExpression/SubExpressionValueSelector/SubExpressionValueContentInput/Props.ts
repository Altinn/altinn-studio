import type { SimpleSubExpressionValueType } from '../../../../../enums/SimpleSubExpressionValueType';
import type { SimpleSubExpressionValue } from '../../../../../types/SimpleSubExpressionValue';

export type Props<T extends SimpleSubExpressionValueType> = {
  onChange: (value: SimpleSubExpressionValue<T>) => void;
  value: SimpleSubExpressionValue<T>;
};
