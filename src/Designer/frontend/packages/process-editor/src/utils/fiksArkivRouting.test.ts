import type { Element, Connection } from 'bpmn-js/lib/model/Types';
import type { FiksArkivRouting } from 'app-shared/types/FiksArkivRouting';
import {
  createOutcomeExpression,
  getFlowOutcome,
  getRoutingIssues,
  isFiksArkivGateway,
  matchesOutcome,
} from './fiksArkivRouting';

const defaults: FiksArkivRouting = {
  successAction: null,
  failureAction: 'reject',
  unavailableReason: null,
};

describe('Fiks Arkiv routing', () => {
  it.each([defaults, { ...defaults, successAction: 'archived', failureAction: 'archiveFailed' }])(
    'generates mutually exclusive routes for the configured actions: %j',
    (routing) => {
      const success = flow(createOutcomeExpression('success', routing));
      const failure = flow(createOutcomeExpression('failure', routing));
      expect(getFlowOutcome(success, routing)).toBe('success');
      expect(getFlowOutcome(failure, routing)).toBe('failure');
      expect(matchesOutcome(success, routing.failureAction)).toBe(false);
      expect(matchesOutcome(failure, routing.successAction)).toBe(false);
      expect(getRoutingIssues(gateway([success, failure]), routing)).toEqual([]);
    },
  );

  it('does not identify confirm as the default success action', () => {
    const confirm = flow(['equals', ['gatewayAction'], 'confirm']);
    expect(getFlowOutcome(confirm, defaults)).toBe('custom');
    expect(
      getRoutingIssues(gateway([confirm, flow(['equals', ['gatewayAction'], 'reject'])]), defaults),
    ).toEqual([{ kind: 'missing', outcome: 'success', flows: expect.any(Array) }]);
  });

  it('reports an unconditional branch that also matches the rejection outcome', () => {
    const unconditional = flow();
    const failure = flow(['equals', ['gatewayAction'], 'reject']);
    expect(getFlowOutcome(unconditional, defaults)).toBe('unset');
    expect(getRoutingIssues(gateway([unconditional, failure]), defaults)).toEqual([
      { kind: 'multiple', outcome: 'failure', flows: [unconditional, failure] },
    ]);
  });

  it('reports duplicate and missing outcomes together', () => {
    const failures = [
      flow(['equals', ['gatewayAction'], 'reject']),
      flow(['equals', ['gatewayAction'], 'reject']),
    ];
    expect(getRoutingIssues(gateway(failures), defaults)).toEqual([
      { kind: 'missing', outcome: 'success', flows: failures },
      { kind: 'multiple', outcome: 'failure', flows: failures },
    ]);
  });

  it('leaves data-dependent expressions custom and reports that routing cannot be verified', () => {
    const custom = flow(['equals', ['dataModel', 'answer'], true]);
    const before = custom.businessObject.conditionExpression.body;
    expect(getFlowOutcome(custom, defaults)).toBe('custom');
    expect(getRoutingIssues(gateway([custom]), defaults).map(({ kind }) => kind)).toEqual([
      'custom',
      'custom',
    ]);
    expect(custom.businessObject.conditionExpression.body).toBe(before);
  });

  it('does not guess outcomes when settings are unavailable', () => {
    const routing: FiksArkivRouting = {
      successAction: null,
      failureAction: null,
      unavailableReason: 'environmentDependent',
    };
    const failure = flow(['equals', ['gatewayAction'], 'reject']);
    expect(getFlowOutcome(failure, routing)).toBe('custom');
    expect(getRoutingIssues(gateway([failure]), routing)).toEqual([]);
  });

  it('does not treat malformed expressions as unconditional', () => {
    const malformed = flow(true);
    malformed.businessObject.conditionExpression.body = '';
    expect(matchesOutcome(malformed, null)).toBeUndefined();
  });

  it('only offers outcome shortcuts when every incoming path comes from Fiks Arkiv', () => {
    const element = gateway([]);
    element.type = 'bpmn:ExclusiveGateway';
    element.incoming = [
      {
        source: {
          businessObject: {
            extensionElements: {
              values: [{ $type: 'altinn:TaskExtension', taskType: 'fiksArkiv' }],
            },
          },
        },
      },
    ] as unknown as Connection[];
    expect(isFiksArkivGateway(element)).toBe(true);
    element.incoming.push({ source: { businessObject: {} } } as unknown as Connection);
    expect(isFiksArkivGateway(element)).toBe(false);
  });
});

function flow(expression?: unknown): Connection {
  return {
    businessObject: {
      conditionExpression:
        expression === undefined ? undefined : { body: JSON.stringify(expression) },
    },
  } as Connection;
}

function gateway(flows: Connection[]): Element {
  return { outgoing: flows } as unknown as Element;
}
