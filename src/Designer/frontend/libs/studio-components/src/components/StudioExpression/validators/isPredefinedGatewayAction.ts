import type { Expression } from '../types/Expression';
import { PredefinedGatewayAction } from '../enums/PredefinedGatewayAction';

export function isPredefinedGatewayAction(
  expression: Expression,
): expression is PredefinedGatewayAction {
  const actions = Object.values(PredefinedGatewayAction);
  return typeof expression === 'string' && actions.includes(expression as PredefinedGatewayAction);
}
