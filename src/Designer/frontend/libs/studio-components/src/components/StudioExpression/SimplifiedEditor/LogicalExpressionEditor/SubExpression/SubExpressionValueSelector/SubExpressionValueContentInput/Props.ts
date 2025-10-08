import type { SimpleSubexpressionValueType } from '../../../../../enums/SimpleSubexpressionValueType';
import type { SimpleSubexpressionValue } from '../../../../../types/SimpleSubexpressionValue';

export type Props<T extends SimpleSubexpressionValueType> = {
  onChange: (value: SimpleSubexpressionValue<T>) => void;
  value: SimpleSubexpressionValue<T>;
};
