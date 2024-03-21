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
      ],
    },
    {
      name: 'PaymentConfig',
      properties: [
        {
          name: 'paymentDataType',
          isMany: false,
          type: 'PaymentDataType',
        },
      ],
    },
    {
      name: 'PaymentDataType',
      properties: [
        {
          name: 'paymentType',
          isMany: false,
          isAttr: false,
          type: 'String',
        },
      ],
    },
    {
      name: 'DataTypesToSign',
      properties: [
        {
          name: 'dataType',
          isMany: true,
          isAttr: false,
          type: 'String',
        },
      ],
    },
  ],
  enumerations: [],
  associations: [],
};
