export const serviceConfig: any = {
  data: {
    APIs: {
      connections: null,
      externalApisById: {
        id1: {
          id: 'id1',
          name: 'Bring postnummer API',
          type: 'value',
          shortname: 'Postnummer',
          uri: 'https://api.bring.com/shippingguide/api/postalCode.json?',
          description: 'Api for å hente poststed basert på postnummer',
          clientParams: {
            pnr: {
              type: 'queryString',
              name: 'pnr',
              value: '',
              required: true,
              example: 'Example: 2050',
            },
          },
          metaParams: {
            clientUrl: {
              type: 'queryString',
              name: 'clientUrl',
              value: '',
              required: true,
              example: 'Example: http://www.sitename.com',
              urlEncode: true,
            },
          },
        },
        id2: {
          id: 'id2',
          name: 'SSB kommuneliste API',
          type: 'list',
          shortname: 'Kommuneliste',
          uri: 'http://data.ssb.no/api/klass/v1/classifications/131/codes?',
          description: 'Api for å hente liste over kommuner i Norge gylidig i gitt tidsrom',
          clientParams: {},
          metaParams: {
            from: {
              type: 'queryString',
              name: 'from',
              value: '2018-01-01',
              required: true,
              example: '2018-01-01',
              urlEncode: false,
            },
            to: {
              type: 'queryString',
              name: 'to',
              value: '2018-08-01',
              required: true,
              example: '2018-08-01',
              urlEncode: false,
            },
          },
        },
      },
      externalApisIds: [
        'id1',
        'id2',
      ],
      availableCodeLists: null,
    },
    ruleConnection: null,
    conditionalRendering: {
      '4766d3f0-551b-11e9-8381-8b007ea64cac': {
        selectedFunction: 'biggerThan10',
        inputParams: {
          number: 'etatid',
        },
        selectedAction: 'Show',
        selectedFields: {
          '476685d0-551b-11e9-8381-8b007ea64cac': '0a100514-7df0-4c05-a453-0132dfc1ac5c',
        },
      },
    },
  },
};
