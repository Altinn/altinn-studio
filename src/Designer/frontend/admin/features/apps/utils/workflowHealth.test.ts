import { describe, expect, it } from 'vitest';
import { AxiosError } from 'axios';
import type { AxiosResponse } from 'axios';
import { workflowCounts } from 'admin/testing/workflowCounts';
import {
  deriveWorkflowHealth,
  extractInstanceGuid,
  isEngineUnavailableError,
  isShownInPlaceError,
  mergeWorkflowHealth,
  WorkflowHealth,
} from './workflowHealth';

const guid = '3a0e0f6e-4b1d-4a2a-9d31-6f8e2b7c1d55';
const otherGuid = '8b1d4f2c-9e77-4a55-b0aa-1c2d3e4f5061';

describe('deriveWorkflowHealth', () => {
  it('reports a failed primary workflow as failed', () => {
    expect(deriveWorkflowHealth(workflowCounts({ primary: { failed: 1 } }))).toBe(
      WorkflowHealth.Failed,
    );
  });

  it('reports a failed auxiliary workflow as such', () => {
    expect(deriveWorkflowHealth(workflowCounts({ auxiliary: { failed: 1 } }))).toBe(
      WorkflowHealth.AuxiliaryWorkflowFailed,
    );
  });

  it('reports work in flight in either role as active', () => {
    expect(deriveWorkflowHealth(workflowCounts({ primary: { active: 2 } }))).toBe(
      WorkflowHealth.Active,
    );
    expect(deriveWorkflowHealth(workflowCounts({ auxiliary: { active: 1 } }))).toBe(
      WorkflowHealth.Active,
    );
  });

  it('reports everything settled as healthy', () => {
    expect(deriveWorkflowHealth(workflowCounts({ total: 5 }))).toBe(WorkflowHealth.Healthy);
  });

  it('reports absent counts as no data rather than healthy', () => {
    expect(deriveWorkflowHealth(undefined)).toBe(WorkflowHealth.NoData);
    expect(deriveWorkflowHealth(null)).toBe(WorkflowHealth.NoData);
  });

  it('gives a failed primary workflow precedence over a failed auxiliary one', () => {
    expect(
      deriveWorkflowHealth(workflowCounts({ primary: { failed: 1 }, auxiliary: { failed: 3 } })),
    ).toBe(WorkflowHealth.Failed);
  });

  it('gives a failed primary workflow precedence over work in flight', () => {
    expect(
      deriveWorkflowHealth(workflowCounts({ primary: { failed: 1 }, auxiliary: { active: 4 } })),
    ).toBe(WorkflowHealth.Failed);
  });

  it('gives a failed auxiliary workflow precedence over work in flight', () => {
    expect(
      deriveWorkflowHealth(workflowCounts({ primary: { active: 4 }, auxiliary: { failed: 1 } })),
    ).toBe(WorkflowHealth.AuxiliaryWorkflowFailed);
  });

  it('names a primary workflow retrying, between a blocked process and a failed auxiliary workflow', () => {
    expect(deriveWorkflowHealth(workflowCounts({ primary: { active: 1, requeued: 1 } }))).toBe(
      WorkflowHealth.Retrying,
    );
    expect(
      deriveWorkflowHealth(
        workflowCounts({ primary: { active: 1, requeued: 1 }, auxiliary: { failed: 1 } }),
      ),
    ).toBe(WorkflowHealth.Retrying);
    expect(
      deriveWorkflowHealth(workflowCounts({ primary: { active: 1, requeued: 1, failed: 1 } })),
    ).toBe(WorkflowHealth.Failed);
  });

  it('reads an auxiliary workflow retrying as work in flight', () => {
    expect(deriveWorkflowHealth(workflowCounts({ auxiliary: { active: 1, requeued: 1 } }))).toBe(
      WorkflowHealth.Active,
    );
  });

  it('names what a primary workflow waits for, below a failed auxiliary workflow', () => {
    expect(
      deriveWorkflowHealth(workflowCounts({ primary: { active: 2, waiting: 1, held: 1 } })),
    ).toBe(WorkflowHealth.Waiting);
    expect(deriveWorkflowHealth(workflowCounts({ primary: { active: 1, held: 1 } }))).toBe(
      WorkflowHealth.Held,
    );
    expect(
      deriveWorkflowHealth(
        workflowCounts({ primary: { active: 1, waiting: 1 }, auxiliary: { failed: 1 } }),
      ),
    ).toBe(WorkflowHealth.AuxiliaryWorkflowFailed);
  });
});

describe('extractInstanceGuid', () => {
  it('accepts a bare instance guid, which is what the admin instance list reports', () => {
    expect(extractInstanceGuid(guid)).toBe(guid);
  });

  it('extracts the guid from a party-prefixed instance id', () => {
    expect(extractInstanceGuid(`51234/${guid}`)).toBe(guid);
  });

  it('rejects anything that is not a guid', () => {
    expect(extractInstanceGuid('not-a-guid')).toBeUndefined();
    expect(extractInstanceGuid('51234/')).toBeUndefined();
    expect(extractInstanceGuid('')).toBeUndefined();
    expect(extractInstanceGuid(undefined)).toBeUndefined();
  });

  it('gives the GUID in lower case, the way the app runtime keys the collection', () => {
    expect(extractInstanceGuid('51234/3A0E0F6E-4B1D-4A2A-9D31-6F8E2B7C1D55')).toBe(
      '3a0e0f6e-4b1d-4a2a-9d31-6f8e2b7c1d55',
    );
  });
});

describe('isEngineUnavailableError', () => {
  const problemError = (type: string, status = 502) => {
    const error = new AxiosError();
    error.response = { status, data: { type } } as AxiosResponse;
    return error;
  };

  it('recognizes the gateway problem for an unreachable engine', () => {
    expect(
      isEngineUnavailableError(
        problemError('urn:altinn:studio:gateway:workflow-engine-unavailable'),
      ),
    ).toBe(true);
  });

  it('recognizes the Designer problem for an unreachable gateway', () => {
    expect(
      isEngineUnavailableError(
        problemError('urn:altinn:studio:designer:runtime-gateway-unavailable'),
      ),
    ).toBe(true);
  });

  it('does not recognize other problems or plain errors', () => {
    expect(
      isEngineUnavailableError(problemError('urn:altinn:studio:designer:invalid-app-name', 400)),
    ).toBe(false);
    expect(isEngineUnavailableError(new Error('boom'))).toBe(false);
    expect(isEngineUnavailableError(undefined)).toBe(false);
  });

  it.each([502, 503, 504])(
    'recognizes a %i with no problem type, which is what an ingress answers with',
    (status) => {
      const error = new AxiosError();
      error.response = { status, data: '<html>502 Bad Gateway</html>' } as AxiosResponse;
      expect(isEngineUnavailableError(error)).toBe(true);
    },
  );

  it('does not treat other server errors as an unreachable engine', () => {
    const error = new AxiosError();
    error.response = { status: 500, data: '' } as AxiosResponse;
    expect(isEngineUnavailableError(error)).toBe(false);
  });

  it('recognizes a status-only response with no body at all', () => {
    const error = new AxiosError();
    error.response = { status: 502 } as AxiosResponse;
    expect(isEngineUnavailableError(error)).toBe(true);
  });
});

describe('mergeWorkflowHealth', () => {
  it('derives health for every key the engine answered for', () => {
    const { healthByKey, pendingKeys } = mergeWorkflowHealth([
      {
        keys: [guid, otherGuid],
        data: {
          data: [
            {
              key: guid,
              namespace: 'ttd/app',
              createdAt: '',
              workflowCounts: workflowCounts({ primary: { failed: 1 } }),
            },
            {
              key: otherGuid,
              namespace: 'ttd/app',
              createdAt: '',
              workflowCounts: workflowCounts(),
            },
          ],
          pageSize: 2,
          totalCount: 2,
        },
      },
    ]);

    expect(healthByKey).toEqual({
      [guid]: WorkflowHealth.Failed,
      [otherGuid]: WorkflowHealth.Healthy,
    });
    expect(pendingKeys.size).toBe(0);
  });

  it('reports an unmatched key as no data, never as healthy', () => {
    const { healthByKey } = mergeWorkflowHealth([
      {
        keys: [guid, otherGuid],
        data: {
          data: [
            { key: guid, namespace: 'ttd/app', createdAt: '', workflowCounts: workflowCounts() },
          ],
          pageSize: 2,
          totalCount: 1,
          unmatchedKeys: [otherGuid],
        },
      },
    ]);

    expect(healthByKey[guid]).toBe(WorkflowHealth.Healthy);
    expect(healthByKey[otherGuid]).toBe(WorkflowHealth.NoData);
  });

  it('reports a 204-style empty answer as no data for every requested key', () => {
    const { healthByKey } = mergeWorkflowHealth([{ keys: [guid], data: null }]);
    expect(healthByKey[guid]).toBe(WorkflowHealth.NoData);
  });

  it('reports the keys of an in-flight request as pending instead of pre-filling a verdict', () => {
    const { healthByKey, pendingKeys } = mergeWorkflowHealth([{ keys: [guid], isPending: true }]);
    expect(healthByKey).toEqual({});
    expect(pendingKeys).toEqual(new Set([guid]));
  });

  it('keeps answered keys while another page is still in flight', () => {
    const { healthByKey, pendingKeys } = mergeWorkflowHealth([
      {
        keys: [guid],
        data: {
          data: [
            { key: guid, namespace: 'ttd/app', createdAt: '', workflowCounts: workflowCounts() },
          ],
          pageSize: 1,
          totalCount: 1,
        },
      },
      { keys: [otherGuid], isPending: true },
    ]);

    expect(healthByKey[guid]).toBe(WorkflowHealth.Healthy);
    expect(healthByKey[otherGuid]).toBeUndefined();
    expect(pendingKeys).toEqual(new Set([otherGuid]));
  });

  it('degrades a failed request to unknown, never to no data', () => {
    const { healthByKey } = mergeWorkflowHealth([{ keys: [guid], error: new Error('boom') }]);

    // No data is a claim about the instance that a request which never answered cannot make.
    expect(healthByKey[guid]).toBe(WorkflowHealth.Unknown);
  });

  it('reports the keys of an unreachable engine as unavailable', () => {
    const { healthByKey } = mergeWorkflowHealth([{ keys: [guid], error: unavailableError() }]);
    expect(healthByKey[guid]).toBe(WorkflowHealth.Unavailable);
  });

  it('degrades only the keys of the request that failed', () => {
    const { healthByKey } = mergeWorkflowHealth([
      {
        keys: [guid],
        data: {
          data: [
            {
              key: guid,
              namespace: 'ttd/app',
              createdAt: '',
              workflowCounts: workflowCounts({ primary: { failed: 1 } }),
            },
          ],
          pageSize: 1,
          totalCount: 1,
        },
      },
      { keys: [otherGuid], error: unavailableError() },
    ]);

    // One transient failure must not erase a verdict another request already established.
    expect(healthByKey[guid]).toBe(WorkflowHealth.Failed);
    expect(healthByKey[otherGuid]).toBe(WorkflowHealth.Unavailable);
  });

  it('reports every key as unavailable when every request hit an unreachable engine', () => {
    const { healthByKey } = mergeWorkflowHealth([
      { keys: [guid], error: unavailableError() },
      { keys: [otherGuid], error: unavailableError() },
    ]);

    expect(healthByKey).toEqual({
      [guid]: WorkflowHealth.Unavailable,
      [otherGuid]: WorkflowHealth.Unavailable,
    });
  });

  it('is empty when nothing was requested', () => {
    expect(mergeWorkflowHealth([])).toEqual({ healthByKey: {}, pendingKeys: new Set() });
  });
});

const unavailableError = () => {
  const error = new AxiosError();
  error.response = {
    status: 502,
    data: { type: 'urn:altinn:studio:gateway:workflow-engine-unavailable' },
  } as AxiosResponse;
  return error;
};

describe('isShownInPlaceError', () => {
  const statusError = (status: number) => {
    const error = new AxiosError();
    error.response = { status, data: {} } as AxiosResponse;
    return error;
  };

  it('covers missing rights and an unreachable engine, which the views explain themselves', () => {
    expect(isShownInPlaceError(statusError(403))).toBe(true);
    expect(isShownInPlaceError(statusError(502))).toBe(true);
  });

  it('leaves every other error to the shared error toast', () => {
    expect(isShownInPlaceError(statusError(500))).toBe(false);
    expect(isShownInPlaceError(statusError(404))).toBe(false);
    expect(isShownInPlaceError(new Error('boom'))).toBe(false);
  });
});
