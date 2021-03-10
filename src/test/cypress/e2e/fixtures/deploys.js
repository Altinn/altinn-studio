var faker = require('faker');
export const deploys = () => {
  var appDeploys = [];
  faker.seed(100);

  appDeploys = {
    "results": [{
      "tagName": "3",
      "envName": "at22",
      "build": {
        "id": "46884",
        "status": "completed",
        "result": "succeeded",
        "started": "2020-11-05T15:10:09.5074341Z",
        "finished": "2020-11-05T15:10:48.081866Z"
      },
      "id": "111dd77c-3409-4174-9cb0-ce94aaabd9c4",
      "created": "2020-11-05T15:09:51.4211187+00:00",
      "createdBy": "testuser",
      "app": "testapp",
      "org": "ttd"
    }]
  };

  return appDeploys;
};
