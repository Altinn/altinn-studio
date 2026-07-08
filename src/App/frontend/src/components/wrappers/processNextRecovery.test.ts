import {
  getLastHistoryNavigationAt,
  getLastProcessNextSuccessAt,
  getProcessNextRecoveryTarget,
  ProcessNextNavigationGraceMs,
  reportProcessNextSuccess,
} from 'src/components/wrappers/processNextRecovery';

describe('getProcessNextRecoveryTarget', () => {
  const base = {
    lastMutationStatus: 'success',
    targetTask: 'Task_2',
    successAt: 10_000,
    lastUserNavigationAt: undefined,
    now: 10_500,
  } as const;

  it('recovers to the target task when the last process/next succeeded within the grace window', () => {
    expect(getProcessNextRecoveryTarget({ ...base })).toEqual('Task_2');
  });

  it('recovers right up to (but not at) the end of the grace window', () => {
    expect(getProcessNextRecoveryTarget({ ...base, now: base.successAt + ProcessNextNavigationGraceMs - 1 })).toEqual(
      'Task_2',
    );
    expect(
      getProcessNextRecoveryTarget({ ...base, now: base.successAt + ProcessNextNavigationGraceMs }),
    ).toBeUndefined();
  });

  it('does not recover when no process/next has run in this session', () => {
    expect(
      getProcessNextRecoveryTarget({ ...base, lastMutationStatus: undefined, successAt: undefined }),
    ).toBeUndefined();
  });

  it.each(['idle', 'pending', 'error'] as const)('does not recover when the last mutation is %s', (status) => {
    expect(getProcessNextRecoveryTarget({ ...base, lastMutationStatus: status })).toBeUndefined();
  });

  it('does not recover without a success timestamp, even if the mutation reports success', () => {
    expect(getProcessNextRecoveryTarget({ ...base, successAt: undefined })).toBeUndefined();
  });

  it('does not recover without a target task (e.g. a success that did not advance the process)', () => {
    expect(getProcessNextRecoveryTarget({ ...base, targetTask: undefined })).toBeUndefined();
  });

  it('anchors the window at success time, so a slow submission does not age out of recovery', () => {
    // The mutation was submitted long ago, but only just succeeded - the decision only looks at
    // successAt, so slow process/next calls (or slow refetches settling after them) still recover.
    const submittedLongAgo = base.successAt - 60_000; // would fail a submittedAt-anchored check
    expect(getProcessNextRecoveryTarget({ ...base, now: submittedLongAgo + 60_000 + 500 })).toEqual('Task_2');
  });

  it('does not hijack a back/forward navigation performed after the success', () => {
    expect(getProcessNextRecoveryTarget({ ...base, lastUserNavigationAt: base.successAt + 200 })).toBeUndefined();
    // Same instant counts as "after": never override a user gesture on a tie
    expect(getProcessNextRecoveryTarget({ ...base, lastUserNavigationAt: base.successAt })).toBeUndefined();
  });

  it('still recovers when the last back/forward navigation happened before the success', () => {
    expect(getProcessNextRecoveryTarget({ ...base, lastUserNavigationAt: base.successAt - 200 })).toEqual('Task_2');
  });

  it('recovers to the receipt when the successful transition ended the process', () => {
    // ProcessWrapper passes getTargetTaskFromProcess() output here, which is TaskKeys.ProcessEnd
    // when the process ended (currentTask is null) - recovery must not require a current task.
    expect(getProcessNextRecoveryTarget({ ...base, targetTask: 'ProcessEnd' })).toEqual('ProcessEnd');
  });
});

describe('timestamp tracking', () => {
  it('reportProcessNextSuccess records the success time', () => {
    reportProcessNextSuccess(12_345);
    expect(getLastProcessNextSuccessAt()).toEqual(12_345);
  });

  it('records browser-history navigation (popstate), which programmatic navigation never fires', () => {
    const before = Date.now();
    window.dispatchEvent(new PopStateEvent('popstate'));
    const after = Date.now();

    const recorded = getLastHistoryNavigationAt();
    expect(recorded).toBeDefined();
    expect(recorded!).toBeGreaterThanOrEqual(before);
    expect(recorded!).toBeLessThanOrEqual(after);
  });
});
