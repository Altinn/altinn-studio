import { BpmnTypeEnum } from '../../../../enum/BpmnTypeEnum';
import type { ProcessShapeElement, ProcessShapeFlow } from './fiksArkivProcessShape';
import { getFiksArkivProcessShapeIssue } from './fiksArkivProcessShape';

describe('getFiksArkivProcessShapeIssue', () => {
  it('reports nothing when a gateway with two outgoing flows follows the task', () => {
    const task = createTask([createGateway('Gateway_1', 2)]);

    expect(getFiksArkivProcessShapeIssue(task)).toBeUndefined();
  });

  it('reports a missing gateway when nothing follows the task', () => {
    expect(getFiksArkivProcessShapeIssue(createTask([]))).toEqual({ kind: 'missingGateway' });
  });

  it('reports a missing gateway when the successor is not a gateway', () => {
    const task = createTask([{ id: 'EndEvent_1', type: BpmnTypeEnum.EndEvent }]);

    expect(getFiksArkivProcessShapeIssue(task)).toEqual({ kind: 'missingGateway' });
  });

  // `gateways.Count != next.Count` in the runtime: one gateway among the successors is not enough,
  // because the process can still leave the task down the flow that skips it.
  it('reports a missing gateway when only some of the successors are gateways', () => {
    const task = createTask([createGateway('Gateway_1', 2), { id: 'Task_2', type: 'bpmn:Task' }]);

    expect(getFiksArkivProcessShapeIssue(task)).toEqual({ kind: 'missingGateway' });
  });

  it('reports the gateways with fewer than two outgoing flows', () => {
    const task = createTask([createGateway('Gateway_1', 1), createGateway('Gateway_2', 2)]);

    expect(getFiksArkivProcessShapeIssue(task)).toEqual({
      kind: 'gatewayWithoutBranches',
      gatewayIds: ['Gateway_1'],
    });
  });

  // A text annotation is attached with a `bpmn:Association`, which sits in the same `outgoing` list
  // as the sequence flows. The runtime counts sequence flows only, so an annotation neither stands
  // in for a branch nor looks like an element following the task.
  describe('with a text annotation attached', () => {
    const annotation: ProcessShapeFlow = {
      type: 'bpmn:Association',
      target: { id: 'TextAnnotation_1', type: 'bpmn:TextAnnotation' },
    };

    it('reports nothing extra about the annotation attached to the task', () => {
      const task = createTask([createGateway('Gateway_1', 2)]);
      task.outgoing.push(annotation);

      expect(getFiksArkivProcessShapeIssue(task)).toBeUndefined();
    });

    it('does not count the annotation attached to the gateway as a branch', () => {
      const gateway = createGateway('Gateway_1', 1);
      gateway.outgoing.push(annotation);

      expect(getFiksArkivProcessShapeIssue(createTask([gateway]))).toEqual({
        kind: 'gatewayWithoutBranches',
        gatewayIds: ['Gateway_1'],
      });
    });
  });
});

type TestElement = ProcessShapeElement & { outgoing: ProcessShapeFlow[] };

const createSequenceFlow = (target?: ProcessShapeElement): ProcessShapeFlow => ({
  type: BpmnTypeEnum.SequenceFlow,
  target,
});

const createGateway = (id: string, outgoingFlowCount: number): TestElement => ({
  id,
  type: BpmnTypeEnum.ExclusiveGateway,
  outgoing: Array.from({ length: outgoingFlowCount }, () => createSequenceFlow()),
});

const createTask = (successors: ProcessShapeElement[]): TestElement => ({
  id: 'FiksArkivTask_1',
  type: BpmnTypeEnum.ServiceTask,
  outgoing: successors.map((successor) => createSequenceFlow(successor)),
});
