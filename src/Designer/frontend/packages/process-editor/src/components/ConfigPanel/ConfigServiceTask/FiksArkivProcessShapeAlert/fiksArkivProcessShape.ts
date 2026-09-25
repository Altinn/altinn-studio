import { ArrayUtils } from '@studio/pure-functions';
import { BpmnTypeEnum } from '../../../../enum/BpmnTypeEnum';

/** The part of a bpmn-js element the rule reads, so it can be exercised with plain objects. */
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

/** One flow for a confirmed archiving and one for the error action. */
const requiredGatewayBranchCount = 2;

/**
 * Mirrors `FiksArkivConfigValidationService.ValidateProcessShape`: a Fiks Arkiv task must be
 * followed only by exclusive gateways, each with at least two outgoing sequence flows. Reports the
 * first of the two failures, as the runtime does.
 */
export const getFiksArkivProcessShapeIssue = (
  task: ProcessShapeElement | undefined,
): FiksArkivProcessShapeIssue | undefined => {
  if (!task) return undefined;

  const successors = getSuccessors(task);
  const gateways = successors.filter(isExclusiveGateway);
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
