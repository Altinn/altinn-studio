/* tslint:disable */
export const testData: any = {
  data: {
    layout: [
      {
        type: 'Input',
        id: '0aae6a0f-2765-42d8-921d-97123827b4d9',
        textResourceBindings: {
          title: '30287.ForetakUtenlandskNavndatadef30287.Label',
        },
        dataModelBindings: {
          simpleBinding: 'etatid',
        },
        required: true,
        readOnly: false,
      },
      {
        type: 'Datepicker',
        id: '0a100514-7df0-4c05-a453-0132dfc1ac5c',
        textResourceBindings: {
          title: 'Datepicker',
        },
        dataModelBindings: {},
        required: true,
        readOnly: false,
      },
      {
        type: 'Dropdown',
        id: '2ccaee6c-3976-4e2b-b6e5-bad1231f720d',
        textResourceBindings: {
          title: 'Dropdown',
        },
        dataModelBindings: {},
        options: [
          {
            label: 'Navn1',
            value: 'navn1',
          },
          {
            label: 'Navn2',
            value: 'navn2',
          },
        ],
      },
      {
        type: 'Checkboxes',
        id: '697c1306-b039-4ce4-973b-c5acea01b07f',
        textResourceBindings: {
          title: 'Checkboxes',
        },
        dataModelBindings: {
          simpleBinding: 'skattyterinforgrp5801.infogrp5802.oppgavegiverNavnPreutfyltdatadef25795.value',
        },
        options: [
          {
            label: 'Navn',
            value: 'Verdi5',
          },
          {
            label: 'Navn',
            value: 'Verdi6',
          },
        ],
        required: false,
        readOnly: false,
      },
      {
        type: 'RadioButtons',
        id: 'ab874837-0bb7-47f1-9cc2-078d861ff70b',
        textResourceBindings: {
          title: 'RadioButtons',
        },
        dataModelBindings: {},
        options: [
          {
            label: 'Navn',
            value: 'Verdi1',
          },
          {
            label: 'Navn',
            value: 'Verdi2',
          },
        ],
        required: false,
        readOnly: false,
      },
      {
        type: 'RadioButtons',
        id: '739750e0-835f-4049-8b30-c020862a1999',
        textResourceBindings: {
          title: 'RadioButtons',
        },
        dataModelBindings: {},
        options: [
          {
            label: 'Navn',
            value: 'Verdi3',
          },
          {
            label: 'Navn',
            value: 'Verdi4',
          },
        ],
        required: false,
        readOnly: true,
      },
      {
        type: 'AddressComponent',
        id: '087b6213-f387-43c8-9878-ff576c4f9caf',
        textResourceBindings: {
          title: 'AddressComponent',
        },
        dataModelBindings: {},
        options: [],
        simplified: true,
        readOnly: true,
      },
      {
        type: 'AddressComponent',
        id: '087b6213-f387-43c8-9878-ff576c4f9fac',
        textResourceBindings: {
          title: 'AddressComponent',
        },
        dataModelBindings: {
          address: 'skattyterinforgrp5801.kontaktgrp5803.kontaktpersonAdressedatadef2751.value',
          zipCode: 'skattyterinforgrp5801.infogrp5802.oppgavegiverPostnummerPreutfyltdatadef25797.value',
          postPlace: 'skattyterinforgrp5801.infogrp5802.oppgavegiverPoststedPreutfyltdatadef25798.value',
        },
        options: [],
        simplified: false,
        readOnly: false,
        required: false,
      },
      {
        type: 'FileUpload',
        id: '8eb20edd-e037-4c12-ab50-50e3cf3f05d5',
        textResourceBindings: {
          title: 'FileUpload',
        },
        dataModelBindings: {},
        options: [],
        displayMode: 'simple',
        readOnly: false,
        maxFileSizeInMB: 10,
        maxNumberOfAttachments: 5,
      },
      {
        type: 'Header',
        id: 'a52e893f-16b5-4df2-8f6f-3dcc09cc8909',
        textResourceBindings: {
          title: 'ServiceName',
        },
        size: 'M',
      },
      {
        type: 'Paragraph',
        id: '3fb932ef-3795-4509-bd57-704609ce946f',
        textResourceBindings: {
          title: '2.KontaktpersonNavndatadef2.Label',
          description: '2.KontaktpersonNavndatadef2.Label',
        },
      },
      {
        type: 'TextArea',
        id: '3fb932ef-3795-4509-bd57-704608ce946g',
        textResourceBindings: {
          title: '2.KontaktpersonNavndatadef2.Label',
          description: '2.KontaktpersonNavndatadef2.Label',
        },
      },
      {
        type: 'Button',
        id: '3fb932ef-3795-3157-bd57-704608ce946g',
        textResourceBindings: {
          title: '2.buttonButton.Label',
        },
      },
    ],
  },
};

/*
    conditionalRendering: {
      '4766d3f0-551b-11e9-8381-8b007ea64cac': {
        selectedFunction: 'biggerThan10',
        inputParams: {
          number: 'etatid'
        },
        selectedAction: 'Show',
        selectedFields: {
          '476685d0-551b-11e9-8381-8b007ea64cac': '0a100514-7df0-4c05-a453-0132dfc1ac5c'
        }
      }
    }
*/

// export const testDataOld: any = {
//   "data": {
//     "components": {
//       "0a100514-7df0-4c05-a453-0132dfc1ac5c": {
//         "component": "Input",
//         "textResourceBindings": {
//           "title": "2.KontaktpersonNavndatadef2.Label",
//           "description": "2.KontaktpersonNavndatadef2.Label"
//         },
//         "dataModelBindings": {
//           "simpleBinding": "utfyllingAvSkjemagrp5809.sporsmalgrp5810.utfyllerFullmaktshaverdatadef25350.value"
//         }
//       },
//       "418af1ce-6e12-4493-99c0-f4aa7ca083d5": {
//         "component": "Header",
//         "textResourceBindings": {
//           "title": "25350.UtfyllerFullmaktshaverdatadef25350.Label"
//         },
//         "dataModelBindings": {}
//       }
//     },
//     "containers": {
//       "d5b9df6d-deda-48c7-95c8-d8598497e5d8": {
//         "repeating": false,
//         "dataModelGroup": null,
//         "index": 0
//       }
//     },
//     "order": {
//       "d5b9df6d-deda-48c7-95c8-d8598497e5d8": [
//         "418af1ce-6e12-4493-99c0-f4aa7ca083d5",
//         "0a100514-7df0-4c05-a453-0132dfc1ac5c"
//       ]
//     }
//   }
// };
