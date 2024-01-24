import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';

const applicationMetadataString = `
{
  "id": "ttd/config",
  "org": "ttd",
  "title": {
    "nb": "config"
  },
  "dataTypes": [
    {
      "id": "ref-data-as-pdf",
      "allowedContentTypes": [
        "application/pdf"
      ],
      "maxCount": 0,
      "minCount": 0,
      "enablePdfCreation": true,
      "enableFileScan": false,
      "validationErrorOnPendingFileScan": false,
      "enabledFileAnalysers": [],
      "enabledFileValidators": []
    },
    {
      "id": "model",
      "allowedContentTypes": [
        "application/xml"
      ],
      "appLogic": {
        "autoCreate": true,
        "classRef": "Altinn.App.Models.model",
        "allowAnonymousOnStateless": false,
        "autoDeleteOnProcessEnd": false
      },
      "taskId": "Task_1",
      "maxCount": 1,
      "minCount": 1,
      "enablePdfCreation": true,
      "enableFileScan": false,
      "validationErrorOnPendingFileScan": false,
      "enabledFileAnalysers": [],
      "enabledFileValidators": []
    }
  ],
  "partyTypesAllowed": {
    "bankruptcyEstate": false,
    "organisation": false,
    "person": false,
    "subUnit": false
  },
  "autoDeleteOnProcessEnd": false,
  "created": "2023-06-09T07:51:11.5919102Z",
  "createdBy": "nkylstad",
  "lastChanged": "2023-06-09T07:51:11.5919147Z",
  "lastChangedBy": "nkylstad"
}
`;

export const applicationMetadataMock: ApplicationMetadata = JSON.parse(applicationMetadataString);
