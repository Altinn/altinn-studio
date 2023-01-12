export const builds = (status) => {
  var appBuilds = [];

  appBuilds = {
    results: [
      {
        tagName: '1',
        name: '1',
        body: 'test',
        targetCommitish: '5a0bb9b8fa4c7ed55d305542fdab79e0e003fac6',
        build: {
          id: '1',
          started: '2020-11-12T08:30:19.1203242Z',
          finished: '2020-11-12T08:32:52.1451396Z',
        },
        id: '09738f82-cd0a-4e3c-9435-03b67308829d',
        created: '2020-11-12T08:30:01.2120074+00:00',
        createdBy: 'test',
        app: 'apps-test',
        org: 'ttd',
      },
    ],
  };

  if (status === 'inprogress') {
    appBuilds.results[0].build.status = 'inprogress';
    appBuilds.results[0].build.result = '';
  }

  if (status === 'succeeded') {
    appBuilds.results[0].build.status = 'completed';
    appBuilds.results[0].build.result = 'succeeded';
  }

  if (status === 'failed') {
    appBuilds.results[0].build.status = 'completed';
    appBuilds.results[0].build.result = 'failed';
  }

  return appBuilds;
};
