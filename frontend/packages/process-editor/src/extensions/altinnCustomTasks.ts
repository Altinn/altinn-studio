export const altinnCustomTasks = {
  name: 'AltinnTask',
  uri: 'http://altinn.no',
  prefix: 'altinn',
  xml: {
    tagAlias: 'lowerCase',
  },
  types: [
    {
      name: 'taskExtension',
      superClass: ['bpmn:ExtensionElements'],
      properties: [
        {
          name: 'taskType',
          isMany: false,
          type: 'String',
        },
        {
          name: 'actions',
          isMany: false,
          type: 'Action',
        },
        {
          name: 'signatureConfig',
          isMany: false,
          type: 'SignatureConfig',
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
