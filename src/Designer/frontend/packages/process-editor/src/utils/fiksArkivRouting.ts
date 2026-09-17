import type { BooleanExpression } from '@studio/components';
import { GeneralRelationOperator, KeyLookupFuncName } from '@studio/components';
import type { Element, Connection } from 'bpmn-js/lib/model/Types';
import type { FiksArkivRouting } from 'app-shared/types/FiksArkivRouting';
import { BpmnTypeEnum } from '../enum/BpmnTypeEnum';
import { TaskUtils } from './taskUtils';

export type FiksArkivOutcome = 'success' | 'failure';
export type FlowOutcome = FiksArkivOutcome | 'custom' | 'unset';

export function isFiksArkivGateway(element: Element | undefined): boolean {
  return (
    element?.type === BpmnTypeEnum.ExclusiveGateway &&
    element.incoming?.length > 0 &&
    element.incoming.every(
      (flow) => TaskUtils.getTaskExtension(flow.source as Element)?.taskType === 'fiksArkiv',
    )
  );
}

export function hasKnownFiksArkivRouting(routing: FiksArkivRouting | undefined): boolean {
  return (
    !!routing &&
    !routing.unavailableReason &&
    routing.failureAction !== null &&
    routing.successAction !== routing.failureAction
  );
}

export function createOutcomeExpression(
  outcome: FiksArkivOutcome,
  routing: FiksArkivRouting,
): BooleanExpression {
  return outcome === 'success' && routing.successAction === null
    ? [GeneralRelationOperator.NotEquals, [KeyLookupFuncName.GatewayAction], routing.failureAction]
    : [
        GeneralRelationOperator.Equals,
        [KeyLookupFuncName.GatewayAction],
        outcome === 'success' ? routing.successAction : routing.failureAction,
      ];
}

/** Only evaluate comparisons whose entire meaning is known here. Data-dependent rules stay custom. */
export function matchesOutcome(flow: Connection, action: string | null): boolean | undefined {
  const body = flow.businessObject?.conditionExpression?.body;
  if (!flow.businessObject?.conditionExpression) return true; // An unconditional flow matches both outcomes in the runtime.
  let expression: unknown;
  try {
    expression = JSON.parse(body);
  } catch {
    return undefined;
  }
  if (!Array.isArray(expression) || expression.length !== 3) return undefined;
  const [operator, left, right] = expression;
  const isGatewayAction = (value: unknown): boolean =>
    Array.isArray(value) && value.length === 1 && value[0] === KeyLookupFuncName.GatewayAction;
  const literal = isGatewayAction(left) ? right : isGatewayAction(right) ? left : undefined;
  if (literal !== null && typeof literal !== 'string') return undefined;
  if (operator === GeneralRelationOperator.Equals) return action === literal;
  if (operator === GeneralRelationOperator.NotEquals) return action !== literal;
  return undefined;
}

export function getFlowOutcome(
  flow: Connection,
  routing: FiksArkivRouting | undefined,
): FlowOutcome {
  if (!flow.businessObject?.conditionExpression) return 'unset';
  if (!hasKnownFiksArkivRouting(routing)) return 'custom';
  const success = matchesOutcome(flow, routing.successAction);
  const failure = matchesOutcome(flow, routing.failureAction);
  if (success === true && failure === false) return 'success';
  if (failure === true && success === false) return 'failure';
  return 'custom';
}

export type RoutingIssue = {
  kind: 'missing' | 'multiple' | 'custom';
  outcome: FiksArkivOutcome;
  flows: Connection[];
};

export function getRoutingIssues(gateway: Element, routing: FiksArkivRouting): RoutingIssue[] {
  if (!hasKnownFiksArkivRouting(routing)) return [];
  const flows = (gateway.outgoing ?? []) as Connection[];
  return (['success', 'failure'] as const).flatMap((outcome): RoutingIssue[] => {
    const action = outcome === 'success' ? routing.successAction : routing.failureAction;
    const matching = flows.filter((flow) => matchesOutcome(flow, action) === true);
    const unknown = flows.filter((flow) => matchesOutcome(flow, action) === undefined);
    if (matching.length > 1) return [{ kind: 'multiple', outcome, flows: matching }];
    if (unknown.length) return [{ kind: 'custom', outcome, flows: unknown }];
    return matching.length === 0 ? [{ kind: 'missing', outcome, flows }] : [];
  });
}
