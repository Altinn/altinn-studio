export const fetchDeploymentStatusResult = {
  inProgress: {
    status: 'inProgress',
    startTime: '2019-04-11T17:26:12.3887035Z',
    finishTime: null,
    success: false,
    message: 'Deployment status: inProgress',
    buildId: '7236',
  },
  failed: {
    status: 'completed',
    startTime: '2019-04-11T17:44:31.8583703Z',
    finishTime: '2019-04-11T17:44:53.4667641Z',
    success: false,
    message: 'Deployment status: completed',
    buildId: '7237',
  },
  success: {
    status: 'completed',
    startTime: '2019-04-11T12:52:10.2722025Z',
    finishTime: '2019-04-11T12:52:34.7263946Z',
    success: true,
    message: 'Deployment status: completed',
    buildId: '7222',
  },
};

export const startDeploymentResult = {
  failed: {
    success: false,
    message: null,
    buildId: null,
  },
  success: {
    success: true,
    message: 'Deployment status: 7222',
    buildId: '7222',
  },
};
