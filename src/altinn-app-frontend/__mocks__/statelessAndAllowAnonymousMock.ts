import type { IApplicationMetadata } from 'src/shared/resources/applicationMetadata';
import type { IRuntimeState } from 'src/types';
import { getInitialStateMock } from './initialStateMock';

export const statelessAndAllowAnonymousMock = (
  allowAnonymous: boolean | undefined,
) => {
  const initialState = getInitialStateMock();
  const initialAppMetadata: IApplicationMetadata = {
    ...initialState.applicationMetadata.applicationMetadata,
    onEntry: {
      show: 'stateless',
    },
  };
  initialAppMetadata.dataTypes[0].appLogic.allowAnonymousOnStateless =
    allowAnonymous;
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
      },
    },
  };
  return mockInitialState;
};
