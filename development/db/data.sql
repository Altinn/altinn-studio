insert into designer.deployments (sequenceno, buildid, tagname, org, app, buildresult, created, entity)
values  (1, '1239', '2403', 'ttd', 'auto-deploy-app-v3', 'succeeded', '2022-01-09 17:19:28.845000 +00:00', '{
  "tagName": "2403",
  "envName": "tt02",
  "createdBy" : "localgiteaadmin",
  "deployedInEnv": false,
  "build": {
    "id": "586909",
    "status": "completed",
    "result": "succeeded",
    "started": "2022-11-21T13:18:13.7716882Z",
    "finished": "2022-11-21T13:19:03.641397Z"
  }
}'),
  (2, '1240', '2404', 'ttd', 'auto-deploy-app-v3', 'failed', '2022-01-10 17:19:28.845000 +00:00', '{
  "tagName": "2404",
  "envName": "at21",
  "createdBy" : "localgiteaadmin",
  "deployedInEnv": false,
  "build": {
    "id": "586910",
    "status": "completed",
    "result": "failed",
    "started": "2022-11-21T13:19:13.7716882Z",
    "finished": "2022-11-21T13:20:03.641397Z"
  }
}'),
  (3, '1241', '2405', 'ttd', 'auto-deploy-app-v3', 'succeeded', '2022-01-11 17:19:28.845000 +00:00', '{
  "tagName": "2405",
  "envName": "at22",
  "createdBy" : "localgiteaadmin",
  "deployedInEnv": true,
  "build": {
    "id": "586911",
    "status": "completed",
    "result": "succeeded",
    "started": "2022-11-22T13:18:13.7716882Z",
    "finished": "2022-11-22T13:19:03.641397Z"
  }
}');
