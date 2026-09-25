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
        {
          name: 'pdfConfig',
          isMany: false,
          type: 'PdfConfig',
        },
        {
          name: 'eFormidlingConfig',
          isMany: false,
          type: 'EFormidlingConfig',
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
        {
          name: 'runDefaultValidator',
          isMany: false,
          type: 'RunDefaultValidator',
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
    {
      name: 'RunDefaultValidator',
      properties: [
        {
          name: 'value',
          isMany: false,
          isBody: true,
          type: 'Boolean',
        },
      ],
    },
    {
      name: 'PdfConfig',
      properties: [
        {
          name: 'filenameTextResourceKey',
          isMany: false,
          isAttr: false,
          type: 'FilenameTextResourceKey',
        },
        {
          name: 'autoPdfTaskIds',
          isMany: false,
          type: 'AutoPdfTaskIds',
        },
      ],
    },
    {
      name: 'FilenameTextResourceKey',
      properties: [
        {
          name: 'value',
          isMany: false,
          isBody: true,
          type: 'String',
        },
      ],
    },
    {
      name: 'AutoPdfTaskIds',
      properties: [
        {
          name: 'taskIds',
          isMany: true,
          isAttr: false,
          type: 'TaskId',
        },
      ],
    },
    {
      name: 'TaskId',
      properties: [
        {
          name: 'value',
          isMany: false,
          isBody: true,
          type: 'String',
        },
      ],
    },
    {
      name: 'EFormidlingConfig',
      properties: [
        {
          name: 'disabled',
          isMany: true,
          type: 'EnvironmentConfig',
          xml: {
            serialize: 'property',
          },
        },
        {
          name: 'receiver',
          isMany: true,
          type: 'EnvironmentConfig',
          xml: {
            serialize: 'property',
          },
        },
        {
          name: 'process',
          isMany: true,
          type: 'EnvironmentConfig',
          xml: {
            serialize: 'property',
          },
        },
        {
          name: 'standard',
          isMany: true,
          type: 'EnvironmentConfig',
          xml: {
            serialize: 'property',
          },
        },
        {
          name: 'typeVersion',
          isMany: true,
          type: 'EnvironmentConfig',
          xml: {
            serialize: 'property',
          },
        },
        {
          name: 'type',
          isMany: true,
          type: 'EnvironmentConfig',
          xml: {
            serialize: 'property',
          },
        },
        {
          name: 'securityLevel',
          isMany: true,
          type: 'EnvironmentConfig',
          xml: {
            serialize: 'property',
          },
        },
        {
          name: 'dpfShipmentType',
          isMany: true,
          type: 'EnvironmentConfig',
          xml: {
            serialize: 'property',
          },
        },
        {
          name: 'dataTypes',
          isMany: true,
          type: 'EFormidlingDataTypes',
          xml: {
            serialize: 'property',
          },
        },
      ],
    },
    {
      name: 'EnvironmentConfig',
      properties: [
        {
          name: 'value',
          isBody: true,
          type: 'String',
        },
        {
          name: 'env',
          isAttr: true,
          type: 'String',
        },
      ],
    },
    {
      name: 'EFormidlingDataTypes',
      properties: [
        {
          name: 'values',
          isMany: true,
          type: 'DataType',
        },
        {
          name: 'env',
          isAttr: true,
          type: 'String',
        },
      ],
    },
  ],
  enumerations: [],
  associations: [],
};
