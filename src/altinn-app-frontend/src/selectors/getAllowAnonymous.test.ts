import type { IApplicationMetadata } from 'src/shared/resources/applicationMetadata';
import type { IRuntimeState } from 'src/types';
import { getInitialStateMock } from '../../__mocks__/initialStateMock';

import { makeGetAllowAnonymousSelector } from './getAllowAnonymous';

describe('selectors > getAllowAnonymous', () => {
  const initialState = getInitialStateMock();
  it('should return true if stateless && allowAnonymous is set to true on dataType', () => {
    const initialAppMetadata: IApplicationMetadata = {
      ...initialState.applicationMetadata.applicationMetadata,
      onEntry: {
        show: 'stateless',
      },
    };
    initialAppMetadata.dataTypes[0].appLogic.allowAnonymousOnStateless = true;
    const mockInitialState: IRuntimeState = {
      ...initialState,
      applicationMetadata: {
        applicationMetadata: initialAppMetadata,
        error: null,
      },
      formLayout: {
        ...initialState.formLayout,
        layoutsets: {
          sets: [
            {
              id: 'stateless',
              dataType: 'test-data-model',
            },
          ],
        }
      }
    };
    const getAllowAnonymous = makeGetAllowAnonymousSelector();
    const result = getAllowAnonymous(mockInitialState);
    expect(result).toBe(true);
  });

  it('should return false if stateless && allowAnonymous is set to false on dataType', () => {
    const initialAppMetadata: IApplicationMetadata = {
      ...initialState.applicationMetadata.applicationMetadata,
      onEntry: {
        show: 'stateless',
      },
    };
    initialAppMetadata.dataTypes[0].appLogic.allowAnonymousOnStateless = false;
    const mockInitialState: IRuntimeState = {
      ...initialState,
      applicationMetadata: {
        applicationMetadata: initialAppMetadata,
        error: null,
      },
      formLayout: {
        ...initialState.formLayout,
        layoutsets: {
          sets: [
            {
              id: 'stateless',
              dataType: 'test-data-model',
            },
          ],
        }
      }
    };
    const getAllowAnonymous = makeGetAllowAnonymousSelector();
    const result = getAllowAnonymous(mockInitialState);
    expect(result).toBe(false);
  });

  it('should return false if stateless && allowAnonymous is not set on dataType', () => {
    const initialAppMetadata: IApplicationMetadata = {
      ...initialState.applicationMetadata.applicationMetadata,
      onEntry: {
        show: 'stateless',
      },
    };

    const mockInitialState: IRuntimeState = {
      ...initialState,
      applicationMetadata: {
        applicationMetadata: initialAppMetadata,
        error: null,
      },
      formLayout: {
        ...initialState.formLayout,
        layoutsets: {
          sets: [
            {
              id: 'stateless',
              dataType: 'test-data-model',
            },
          ],
        }
      }
    };
    const getAllowAnonymous = makeGetAllowAnonymousSelector();
    const result = getAllowAnonymous(mockInitialState);
    expect(result).toBe(false);
  });

  it('should return false if not stateless', () => {
    const getAllowAnonymous = makeGetAllowAnonymousSelector();
    const result = getAllowAnonymous(initialState);
    expect(result).toBe(false);
  });

  it('should return undefined if app metadata is not loaded', () => {
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
})
