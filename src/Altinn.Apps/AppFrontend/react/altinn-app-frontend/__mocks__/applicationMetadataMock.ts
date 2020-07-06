const applicationMetadataJSON = `{
  "id": "ttd/test-app",
  "org": "ttd",
  "title": {
    "nb": "Test App"
  },
  "dataTypes": [
    {
      "id": "test-data-model",
      "allowedContentTypes": [
        "application/xml"
      ],
      "appLogic": {
        "autoCreate": true,
        "classRef": "Altinn.App.Models.Skjema"
      },
      "taskId": "Task_1",
      "maxCount": 1,
      "minCount": 1
    },
    {
      "id": "ref-data-as-pdf",
      "allowedContentTypes": [
        "application/pdf"
      ],
      "maxCount": 0,
      "minCount": 0
    }
  ],
  "partyTypesAllowed": {
    "bankruptcyEstate": false,
    "organisation": false,
    "person": true,
    "subUnit": false
  },
  "created": "2020-06-29T08:47:12.425551Z",
  "createdBy": "test testesen",
  "lastChanged": "2020-06-29T08:47:12.4255537Z",
  "lastChangedBy": "test testesen"
}`;

export const applicationMetadataMock = JSON.parse(applicationMetadataJSON);
