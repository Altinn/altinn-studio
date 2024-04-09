import type { RootState } from '../store';
import { repository } from 'app-shared/mocks/mocks';

export const rootStateMock: RootState = {
  serviceInformation: {
    repositoryInfo: repository,
    error: null,
    initialCommit: null,
    serviceDescriptionObj: {
      description: 'mockDescription',
      saving: false,
    },
    serviceNameObj: {
      name: 'mockName',
      saving: false,
    },
    serviceIdObj: {
      serviceId: 'mockId',
      saving: false,
    },
  },
  userState: {
    session: {
      remainingMinutes: 25,
    },
    error: null,
    permissions: {
      deploy: {
        environments: [],
      },
    },
  },
};
