import { preferFreshestInstanceData } from 'src/core/queries/instance/instance.queries';
import type { IInstance } from 'src/types/shared';

function instanceOnFlow(flow: number | undefined, ended?: string): IInstance {
  return {
    id: '500000/instance-guid',
    process: {
      started: '2026-07-30T10:00:00Z',
      ended,
      currentTask: flow === undefined ? undefined : { flow, elementId: `Task_${flow}` },
    },
  } as unknown as IInstance;
}

describe('preferFreshestInstanceData', () => {
  it('rejects a response that regresses the process flow - a stale read that raced a mutation', () => {
    // The failing scenario from the e2e suite: a reject's result (flow 4, Task_1) written by the
    // mutation, then a poll that was in flight during the reject delivers the superseded failed
    // state (flow 3, Task_Service). The cache must keep the mutation's result.
    const fresh = instanceOnFlow(4);
    const stale = instanceOnFlow(3);

    expect(preferFreshestInstanceData(fresh, stale)).toBe(fresh);
  });

  it('accepts a response with the same flow - ordinary polls and data updates', () => {
    const current = instanceOnFlow(3);
    const update = instanceOnFlow(3);

    // replaceEqualDeep may reuse old references for deep-equal content - assert content, not identity.
    expect(preferFreshestInstanceData(current, update)).toStrictEqual(update);
  });

  it('accepts a response that advances the flow', () => {
    const current = instanceOnFlow(3);
    const advanced = instanceOnFlow(4);

    expect(preferFreshestInstanceData(current, advanced)).toStrictEqual(advanced);
  });

  it('rejects a response that un-ends an ended process', () => {
    const endedInstance = instanceOnFlow(undefined, '2026-07-30T11:00:00Z');
    const stale = instanceOnFlow(5);

    expect(preferFreshestInstanceData(endedInstance, stale)).toBe(endedInstance);
  });

  it('accepts a response that ends the process', () => {
    const current = instanceOnFlow(5);
    const endedInstance = instanceOnFlow(undefined, '2026-07-30T11:00:00Z');

    expect(preferFreshestInstanceData(current, endedInstance)).toStrictEqual(endedInstance);
  });

  it('accepts anything when there is no previous data', () => {
    const first = instanceOnFlow(1);

    expect(preferFreshestInstanceData(undefined, first)).toBe(first);
  });
});
