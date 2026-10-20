import { ArrayUtils } from '@studio/pure-functions';
import { BpmnTypeEnum } from '../../../../enum/BpmnTypeEnum';

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
  /** The task has no outgoing flow, or a flow leads to an element other than an exclusive gateway. */
  | { kind: 'missingGateway' }
  /** All following elements are exclusive gateways, but some have fewer than two outgoing flows. */
  | { kind: 'gatewayWithoutBranches'; gatewayIds: string[] };

/** One flow handles successful archiving; the other handles errors. */
const requiredGatewayBranchCount = 2;

/**
 * Match FiksArkivConfigValidationService.ValidateProcessShape. Each element after the task must be an
 * exclusive gateway with at least two outgoing flows. Report the first failed rule.
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
