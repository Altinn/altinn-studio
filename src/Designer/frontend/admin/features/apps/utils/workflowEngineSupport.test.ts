import { usesWorkflowEngine } from './workflowEngineSupport';

describe('usesWorkflowEngine', () => {
  it('holds from version 9 of the app libraries, as the app reports it or shortened', () => {
    expect(usesWorkflowEngine('9.0.0.175')).toBe(true);
    expect(usesWorkflowEngine('9.0.0')).toBe(true);
    expect(usesWorkflowEngine('10.1.0.0')).toBe(true);
  });

  it('does not hold for earlier versions', () => {
    expect(usesWorkflowEngine('8.5.1.0')).toBe(false);
    expect(usesWorkflowEngine('7.15.0')).toBe(false);
  });

  it('does not hold for a version that is missing or unreadable', () => {
    expect(usesWorkflowEngine(undefined)).toBe(false);
    expect(usesWorkflowEngine('')).toBe(false);
    expect(usesWorkflowEngine('unknown')).toBe(false);
    expect(usesWorkflowEngine('v9.0.0')).toBe(false);
  });
});
