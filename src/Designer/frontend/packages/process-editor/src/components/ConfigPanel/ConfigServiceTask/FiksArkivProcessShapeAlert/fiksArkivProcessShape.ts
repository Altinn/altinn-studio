import { ArrayUtils } from '@studio/pure-functions';
import { BpmnTypeEnum } from '../../../../enum/BpmnTypeEnum';

/**
 * The part of a bpmn-js element this rule reads: an id, a type, and the connections leaving it.
 *
 * Declared structurally rather than as bpmn-js' own `Element`, which a diagram element satisfies,
 * so the rule can be exercised with plain objects instead of the geometry and business objects a
 * real element carries. It is also the whole of what the rule depends on, written out.
 *
 * `type` is optional only because diagram-js declares what a connection leads to as its own
 * loosely typed element, which does not re-declare the property. Every element on a diagram has a
 * type, and an element the rule cannot read one from is treated as an element that is not a
 * gateway, which is the reading that warns rather than the one that stays quiet.
 */
export type ProcessShapeElement = {
  id: string;
  type?: string;
  outgoing?: ProcessShapeFlow[];
};

export type ProcessShapeFlow = {
  type?: string;
  target?: ProcessShapeElement;
};

export type FiksArkivProcessShapeIssue =
  /** Nothing follows the task, or something that is not an exclusive gateway does. */
  | { kind: 'missingGateway' }
  /** Every successor is an exclusive gateway, but these ones have nowhere to diverge to. */
  | { kind: 'gatewayWithoutBranches'; gatewayIds: string[] };

/**
 * One for a confirmed archiving and one for the error action. Fewer than that and the gateway is
 * not telling the two outcomes apart, which is the only reason it has to be there.
 */
const requiredGatewayBranchCount = 2;

/**
 * Why the app would refuse to start on the shape this task sits in, or `undefined` when it would
 * start.
 *
 * Mirrors `FiksArkivConfigValidationService.ValidateProcessShape`, which throws on startup when a
 * Fiks Arkiv task is not followed by an exclusive gateway with at least two outgoing sequence
 * flows. The task always moves the process on when it concludes: with the success action when the
 * archive confirms the record, and with the error action when it cannot. The gateway is where those
 * two paths diverge, so without one a rejected archiving would follow the same flow as a confirmed
 * one, silently.
 *
 * The runtime throws on the first task that fails, and stops at the first of the two failures, so
 * the panel reports one issue rather than a list: fixing it is what reveals whether there is
 * another.
 */
export const getFiksArkivProcessShapeIssue = (
  task: ProcessShapeElement | undefined,
): FiksArkivProcessShapeIssue | undefined => {
  if (!task) return undefined;

  const successors = getSuccessors(task);
  const gateways = successors.filter(isExclusiveGateway);
  // `next.Count == 0 || gateways.Count != next.Count` in the runtime: every element right after the
  // task has to be a gateway, and there has to be at least one.
  if (successors.length === 0 || gateways.length !== successors.length) {
    return { kind: 'missingGateway' };
  }

  const gatewayIdsWithoutBranches = ArrayUtils.removeDuplicates(
    gateways
      .filter((gateway) => getOutgoingSequenceFlows(gateway).length < requiredGatewayBranchCount)
      .map((gateway) => gateway.id),
  );

  return gatewayIdsWithoutBranches.length > 0
    ? { kind: 'gatewayWithoutBranches', gatewayIds: gatewayIdsWithoutBranches }
    : undefined;
};

const getOutgoingSequenceFlows = (element: ProcessShapeElement): ProcessShapeFlow[] =>
  (element.outgoing ?? []).filter((flow) => flow.type === BpmnTypeEnum.SequenceFlow);

const getSuccessors = (task: ProcessShapeElement): ProcessShapeElement[] =>
  getOutgoingSequenceFlows(task).flatMap((flow) => (flow.target ? [flow.target] : []));

const isExclusiveGateway = (element: ProcessShapeElement): boolean =>
  element.type === BpmnTypeEnum.ExclusiveGateway;
