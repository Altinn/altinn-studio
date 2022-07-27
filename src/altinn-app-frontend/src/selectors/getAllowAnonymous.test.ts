import { getInitialStateMock } from '__mocks__/initialStateMock';
import { statelessAndAllowAnonymousMock } from '__mocks__/statelessAndAllowAnonymousMock';

import { makeGetAllowAnonymousSelector } from 'src/selectors/getAllowAnonymous';
import type { IRuntimeState } from 'src/types';

describe('getAllowAnonymous', () => {
  it('should return true if stateless && allowAnonymous is set to true on dataType', () => {
    const mockInitialState = statelessAndAllowAnonymousMock(true);
    const getAllowAnonymous = makeGetAllowAnonymousSelector();
    const result = getAllowAnonymous(mockInitialState);
    expect(result).toBe(true);
  });

  it('should return false if stateless && allowAnonymous is set to false on dataType', () => {
    const mockInitialState = statelessAndAllowAnonymousMock(false);
    const getAllowAnonymous = makeGetAllowAnonymousSelector();
    const result = getAllowAnonymous(mockInitialState);
    expect(result).toBe(false);
  });

  it('should return false if stateless && allowAnonymous is not set on dataType', () => {
    const mockInitialState = statelessAndAllowAnonymousMock(undefined);
    const getAllowAnonymous = makeGetAllowAnonymousSelector();
    const result = getAllowAnonymous(mockInitialState);
    expect(result).toBe(false);
  });

  it('should return false if not stateless', () => {
    const initialState = getInitialStateMock();
    const getAllowAnonymous = makeGetAllowAnonymousSelector();
    const result = getAllowAnonymous(initialState);
    expect(result).toBe(false);
  });

  it('should return undefined if app metadata is not loaded', () => {
    const initialState = getInitialStateMock();
    const mockInitialState: IRuntimeState = {
      ...initialState,
      applicationMetadata: {
        applicationMetadata: null,
        error: null,
      },
    };
    const getAllowAnonymous = makeGetAllowAnonymousSelector();
    const result = getAllowAnonymous(mockInitialState);
    expect(result).toBe(undefined);
  });

  it('should return undefined if layout sets is not loaded', () => {
    const initialState = getInitialStateMock();
    const mockInitialState: IRuntimeState = {
      ...initialState,
      applicationMetadata: {
        applicationMetadata: null,
        error: null,
      },
    };
    const getAllowAnonymous = makeGetAllowAnonymousSelector();
    const result = getAllowAnonymous(mockInitialState);
    expect(result).toBe(undefined);
  });
});
