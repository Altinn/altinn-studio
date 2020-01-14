import 'jest';
import {
  convertFromLayoutToInternalFormat,
  convertInternalToLayoutFormat,
  extractChildrenFromContainer,
  getParentContainerId,
} from '../../../utils/formLayout';

describe('>>> utils/formLayout', () => {
  let mockInternal: any;
  let mockLayout: any;
  beforeEach(() => {
    mockInternal = {
      components: {
        '46882e2b-8097-4170-ad4c-32cdc156634e': {
          type: 'Header',
          itemType: 'COMPONENT',
          textResourceBindings: {
            title: 'ServiceName',
          },
          dataModelBindings: {},
          size: 'L',
        },
        'ede0b05d-2c53-4feb-bdd4-4c61b89bd729': {
          type: 'Paragraph',
          itemType: 'COMPONENT',
          textResourceBindings: {
            title: 'ServiceName',
          },
          dataModelBindings: {},
        },
      },
      containers: {
        'f35e6f67-7d3a-4e20-a538-90d94e6c29a1': {
          repeating: false,
          dataModelGroup: null,
          index: 0,
        },
      },
      order: {
        'f35e6f67-7d3a-4e20-a538-90d94e6c29a1': [
          '46882e2b-8097-4170-ad4c-32cdc156634e',
          'ede0b05d-2c53-4feb-bdd4-4c61b89bd729',
        ],
      },
    };
    mockLayout = [
      {
        id: '17314adc-f75d-4a49-b726-242e2ae32ad2',
        type: 'Input',
        textResourceBindings: {
          title: 'Input',
        },
        dataModelBindings: {},
        required: false,
        readOnly: false,
      },
      {
        id: '68a15abf-3a55-4cc6-b9cc-9bfa5fe9b51a',
        type: 'Input',
        textResourceBindings: {
          title: 'Input',
        },
        dataModelBindings: {},
        required: false,
        readOnly: false,
      },
    ];
  });
  it('+++ convertFromLayoutToInternalFormat should convert to correct format', () => {
    const convertedLayout = convertFromLayoutToInternalFormat(mockLayout);
    const mockResult = {
      components: {
        '17314adc-f75d-4a49-b726-242e2ae32ad2': {
          dataModelBindings: {},
          itemType: 'COMPONENT',
          readOnly: false,
          required: false,
          textResourceBindings: {
            title: 'Input',
          },
          type: 'Input',
        },
        '68a15abf-3a55-4cc6-b9cc-9bfa5fe9b51a': {
          dataModelBindings: {},
          itemType: 'COMPONENT',
          readOnly: false,
          required: false,
          textResourceBindings: {
            title: 'Input',
          },
          type: 'Input',
        },
      },
    };

    expect(convertedLayout.components).toEqual(mockResult.components);
  });
  it('+++ convertFromLayoutToInternalFormat should return empty IFormDesignerLayout if no formLayout', () => {
    const convertedLayout = convertFromLayoutToInternalFormat(null);
    expect(convertedLayout).toEqual({ containers: {}, components: {}, order: {} });
  });
  it('+++ convertFromLayoutToInternalFormat should convert component.component to component.type', () => {
    mockLayout = [
      {
        id: '17314adc-f75d-4a49-b726-242e2ae32ad2',
        component: 'Input',
        itemType: 'COMPONENT',
        textResourceBindings: {
          title: 'Input',
        },
        dataModelBindings: {},
        required: false,
        readOnly: false,
      },
      {
        id: '68a15abf-3a55-4cc6-b9cc-9bfa5fe9b51a',
        component: 'Input',
        itemType: 'COMPONENT',
        textResourceBindings: {
          title: 'Input',
        },
        dataModelBindings: {},
        required: false,
        readOnly: false,
      },
    ];
    const mockResult = {
      components: {
        '17314adc-f75d-4a49-b726-242e2ae32ad2': {
          dataModelBindings: {},
          itemType: 'COMPONENT',
          readOnly: false,
          required: false,
          textResourceBindings: {
            title: 'Input',
          },
          type: 'Input',
        },
        '68a15abf-3a55-4cc6-b9cc-9bfa5fe9b51a': {
          dataModelBindings: {},
          itemType: 'COMPONENT',
          readOnly: false,
          required: false,
          textResourceBindings: {
            title: 'Input',
          },
          type: 'Input',
        },
      },
    };
    const convertedLayout = convertFromLayoutToInternalFormat(mockLayout);
    expect(convertedLayout.components).toEqual(mockResult.components);
  });
  it('+++ convertInternalToLayoutFormat should convert to correct format', () => {
    const convertedLayout = convertInternalToLayoutFormat(mockInternal);
    const mockResult = [{
      id: '46882e2b-8097-4170-ad4c-32cdc156634e',
      type: 'Header',
      textResourceBindings: { title: 'ServiceName' },
      dataModelBindings: {},
      size: 'L',
    },
    {
      id: 'ede0b05d-2c53-4feb-bdd4-4c61b89bd729',
      type: 'Paragraph',
      textResourceBindings: { title: 'ServiceName' },
      dataModelBindings: {},
    }];
    expect(Array.isArray(convertedLayout)).toBe(true);
    expect(convertedLayout).toEqual(mockResult);
  });
  it('+++ convertInternalToLayoutFormat should convert component.component to component.type', () => {
    mockInternal = {
      components: {
        '46882e2b-8097-4170-ad4c-32cdc156634e': {
          component: 'Header',
          textResourceBindings: {
            title: 'ServiceName',
          },
          dataModelBindings: {},
          size: 'L',
        },
        'ede0b05d-2c53-4feb-bdd4-4c61b89bd729': {
          component: 'Paragraph',
          textResourceBindings: {
            title: 'ServiceName',
          },
          dataModelBindings: {},
        },
      },
      containers: {
        'f35e6f67-7d3a-4e20-a538-90d94e6c29a1': {
          repeating: false,
          dataModelGroup: null,
          index: 0,
        },
      },
      order: {
        'f35e6f67-7d3a-4e20-a538-90d94e6c29a1': [
          '46882e2b-8097-4170-ad4c-32cdc156634e',
          'ede0b05d-2c53-4feb-bdd4-4c61b89bd729',
        ],
      },
    };
    const mockResult = [
      {
        id: '46882e2b-8097-4170-ad4c-32cdc156634e',
        type: 'Header',
        textResourceBindings: {
          title: 'ServiceName',
        },
        dataModelBindings: {},
        size: 'L',
      },
      {
        id: 'ede0b05d-2c53-4feb-bdd4-4c61b89bd729',
        type: 'Paragraph',
        textResourceBindings: {
          title: 'ServiceName',
        },
        dataModelBindings: {},
      },
    ];
    const convertedLayout = convertInternalToLayoutFormat(mockInternal);
    expect(convertedLayout).toEqual(mockResult);
  });

  it('+++ getParentContainerId should return correct parent container id', () => {
    const result = getParentContainerId('46882e2b-8097-4170-ad4c-32cdc156634e', { layout: mockInternal });
    expect(result).toBe('f35e6f67-7d3a-4e20-a538-90d94e6c29a1');
  });

  it('+++ extractChildrenFromContainer should return all children from a container', () => {
    const mockContainer = {
      id: 'mockContainerID',
      children: [
        { id: 'mockChildID_1', someProp: '1' },
        { id: 'mockChildID_2', someProp: '2' },
      ],
    };
    const mockConvertedLayout = {
      containers: {},
      components: {},
      order: {},
    };
    const mockConvertedLayoutResult = {
      containers: { mockContainerID: { itemType: 'CONTAINER' } },
      components: {
        mockChildID_1: { someProp: '1', itemType: 'COMPONENT' },
        mockChildID_2: { someProp: '2', itemType: 'COMPONENT' },
      },
      order: { mockContainerID: ['mockChildID_1', 'mockChildID_2'] },
    };
    extractChildrenFromContainer(mockContainer, mockConvertedLayout);
    expect(mockConvertedLayout).toEqual(mockConvertedLayoutResult);
  });
  it('+++ if children of children, run same function over again', () => {
    const mockContainer = {
      id: 'mockContainerID',
      children: [
        { id: 'mockChildID_1', children: [{ id: 'mockChildID_3', someProp: '3' }] },
        { id: 'mockChildID_2', someProp: '2' },
      ],
    };
    const mockConvertedLayout = {
      containers: {},
      components: {},
      order: {},
    };
    const mockConvertedLayoutResult = {
      containers: {
        mockChildID_1: { itemType: 'CONTAINER' },
        mockContainerID: { itemType: 'CONTAINER' },
      },
      components: {
        mockChildID_2: { someProp: '2', itemType: 'COMPONENT' },
        mockChildID_3: { someProp: '3', itemType: 'COMPONENT' },
      },
      order: { mockChildID_1: ['mockChildID_3'], mockContainerID: ['mockChildID_2'] },
    };
    extractChildrenFromContainer(mockContainer, mockConvertedLayout);
    expect(mockConvertedLayout).toEqual(mockConvertedLayoutResult);
  });
  it('+++ if the element contains children in convertFromLayoutToInternalFormat ' +
    'extractChildrenFromContainer should run', () => {
      mockLayout = [
        { id: 'mockChildID_1', children: [{ id: 'mockChildID_2', someProp: '2' }] },
        { id: 'mockChildID_3', children: [{ id: 'mockChildID_4', someProp: '4' }] },
        { id: 'mockChildID_5', someProp: '5' },
      ];
      const mockResult = {
        containers: {
          mockChildID_1: { itemType: 'CONTAINER' },
        },
        components: {
          mockChildID_2: { someProp: '2', itemType: 'COMPONENT' },
          mockChildID_4: { someProp: '4', itemType: 'COMPONENT' },
          mockChildID_5: { someProp: '5', itemType: 'COMPONENT' },
        },
      };
      const convertedLayout = convertFromLayoutToInternalFormat(mockLayout);
      expect(convertedLayout.components).toEqual(mockResult.components);
    });
});
