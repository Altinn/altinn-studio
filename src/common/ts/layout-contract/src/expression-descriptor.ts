import type { ExprVal, ExprValToActual } from './expression-types';

/** Static metadata for evaluating one layout property. Runtime context belongs to the consumer. */
export interface ExpressionDescriptor<V extends ExprVal = ExprVal> {
  readonly returnType: V;
  readonly defaultValue: ExprValToActual<V>;
  readonly errorIntroText: string;
  readonly propertyPath: string;
}
