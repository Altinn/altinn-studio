export const altinnCustomTasks = {
  name: 'AltinnTask',
  uri: 'http://altinn.no/process',
  prefix: 'altinn',
  xml: {
    tagAlias: 'lowerCase',
  },
  types: [
    {
      name: 'TaskExtension',
      superClass: ['Element'],
      properties: [
        {
          name: 'taskType',
          isMany: false,
          type: 'String',
        },
        {
          name: 'actions',
          isMany: false,
          isAttr: false,
          type: 'Actions',
        },
        {
          name: 'signatureConfig',
          isMany: false,
          type: 'SignatureConfig',
        },
        {
          name: 'paymentConfig',
          isMany: false,
          type: 'PaymentConfig',
        },
      ],
    },
    {
      name: 'Actions',
      properties: [
        {
          name: 'action',
          isMany: true,
          isAttr: false,
          type: 'Action',
        },
      ],
    },
    {
      name: 'Action',
      properties: [
        {
          name: 'action',
          isMany: false,
          isBody: true,
          type: 'String',
        },
        {
          name: 'type',
          isMany: false,
          isAttr: true,
          type: 'String',
        },
      ],
    },
    {
      name: 'SignatureConfig',
      properties: [
        {
          name: 'dataTypesToSign',
          isMany: false,
          type: 'DataTypesToSign',
        },
        {
          name: 'signatureDataType',
          isMany: false,
          type: 'String',
        },
        {
          name: 'uniqueFromSignaturesInDataTypes',
          isMany: false,
          type: 'UniqueFromSignaturesInDataTypes',
        },
        {
          name: 'signeeStatesDataTypeId',
          isMany: false,
          type: 'String',
        },
        {
          name: 'signeeProviderId',
          isMany: false,
          type: 'String',
        },
        {
          name: 'signingPdfDataType',
          isMany: false,
          type: 'String',
        },
        {
          name: 'correspondenceResource',
          isMany: false,
          type: 'String',
        },
      ],
    },
    {
      name: 'PaymentConfig',
      properties: [
        {
          name: 'paymentDataType',
          isMany: false,
          type: 'String',
        },
        {
          name: 'paymentReceiptPdfDataType',
          isMany: false,
          type: 'String',
        },
      ],
    },
    {
      name: 'DataTypesToSign',
      properties: [
        {
          name: 'dataTypes',
          isMany: true,
          isAttr: false,
          type: 'DataType',
        },
      ],
    },
    {
      name: 'DataType',
      properties: [
        {
          name: 'dataType',
          isMany: false,
          isBody: true,
          type: 'String',
        },
      ],
    },
    {
      name: 'UniqueFromSignaturesInDataTypes',
      properties: [
        {
          name: 'dataTypes',
          isMany: true,
          isAttr: false,
          type: 'DataType',
        },
      ],
    },
  ],
  enumerations: [],
  associations: [],
};
