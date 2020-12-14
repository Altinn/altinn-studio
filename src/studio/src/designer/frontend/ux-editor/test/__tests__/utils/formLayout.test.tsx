/* eslint-disable no-undef */
import 'jest';
import { convertFromLayoutToInternalFormat,
  convertInternalToLayoutFormat,
  extractChildrenFromGroup } from '../../../utils/formLayout';

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
        'group-paragraph': {
          type: 'Paragraph',
          itemType: 'COMPONENT',
          textResourceBindings: {
            title: 'ServiceName',
          },
          dataModelBindings: {},
        },
        'group-child-paragraph': {
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
        'group-container': {
          dataModelBindings: {},
          repeating: false,
        },
        'group-child-container': {
          dataModelBindings: {},
          repeating: true,
        },
      },
      order: {
        'f35e6f67-7d3a-4e20-a538-90d94e6c29a1': [
          '46882e2b-8097-4170-ad4c-32cdc156634e',
          'ede0b05d-2c53-4feb-bdd4-4c61b89bd729',
          'group-container',
        ],
        'group-container': [
          'group-paragraph',
          'group-child-container',
        ],
        'group-child-container': [
          'group-child-paragraph',
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
  it('+++ convertFromLayoutToInternalFormat should initiate an form layout with a base container', () => {
    const convertedLayout = convertFromLayoutToInternalFormat(null);
    expect(Object.keys(convertedLayout.containers).length).toEqual(1);
    expect(Object.keys(convertedLayout.components).length).toEqual(0);
    expect(Object.keys(convertedLayout.order).length).toEqual(1);
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
    },
    {
      id: 'group-container',
      type: 'Group',
      dataModelBindings: {},
      repeating: false,
      children: [
        'group-paragraph',
        'group-child-container',
      ],
    },
    {
      id: 'group-paragraph',
      type: 'Paragraph',
      textResourceBindings: { title: 'ServiceName' },
      dataModelBindings: {},
    },
    {
      id: 'group-child-container',
      type: 'Group',
      dataModelBindings: {},
      repeating: true,
      children: [
        'group-child-paragraph',
      ],
    },
    {
      id: 'group-child-paragraph',
      type: 'Paragraph',
      textResourceBindings: { title: 'ServiceName' },
      dataModelBindings: {},
    },
    ];
    expect(Array.isArray(convertedLayout)).toBe(true);
    expect(convertedLayout).toEqual(mockResult);
  });

  it('+++ extractChildrenFromGroup should return all children from a container', () => {
    const mockGroup = {
      id: 'mock-group-id',
      children: [
        'mock-component-1',
        'mock-component-2',
      ],
    };
    const mockComponents = [
      {
        id: 'mock-component-1',
        someProp: '1',
      },
      {
        id: 'mock-component-2',
        someProp: '2',
      },
    ];
    const mockConvertedLayout = {
      containers: {},
      components: {},
      order: {},
    };
    const mockConvertedLayoutResult = {
      containers: { 'mock-group-id': { itemType: 'CONTAINER' } },
      components: {
        'mock-component-1': { someProp: '1', itemType: 'COMPONENT' },
        'mock-component-2': { someProp: '2', itemType: 'COMPONENT' },
      },
      order: { 'mock-group-id': ['mock-component-1', 'mock-component-2'] },
    };
    extractChildrenFromGroup(mockGroup, mockComponents, mockConvertedLayout);
    expect(mockConvertedLayout).toEqual(mockConvertedLayoutResult);
  });

  it('+++ if the element contains children in convertFromLayoutToInternalFormat ' +
    'extractChildrenFromContainer should run', () => {
    mockLayout = [
      {
        id: 'mockChildID_1', type: 'Group', children: ['mockChildID_2'],
      },
      {
        id: 'mockChildID_3', type: 'Group', children: ['mockChildID_4', 'mockChildID_6'],
      },
      {
        id: 'mockChildID_2', type: 'Header', someProp: '2',
      },
      {
        id: 'mockChildID_4', type: 'Paragraph', someProp: '4',
      },
      {
        id: 'mockChildID_5', type: 'Dropdown', someProp: '5',
      },
      {
        id: 'mockChildID_6', type: 'Group', children: ['mockChildID_7'],
      },
      {
        id: 'mockChildID_7', type: 'Input', someProp: '7',
      },
    ];
    const expectedComponentResult = {
      containers: {
        mockChildID_1: { itemType: 'CONTAINER' },
        mockChildID_3: { itemType: 'CONTAINER' },
        mockChildID_6: { itemType: 'CONTAINER' },
      },
      components: {
        mockChildID_2: {
          someProp: '2', type: 'Header', itemType: 'COMPONENT',
        },
        mockChildID_4: {
          someProp: '4', type: 'Paragraph', itemType: 'COMPONENT',
        },
        mockChildID_5: {
          someProp: '5', type: 'Dropdown', itemType: 'COMPONENT',
        },
        mockChildID_7: {
          someProp: '7', type: 'Input', itemType: 'COMPONENT',
        },
      },
    };

    const convertedLayout = convertFromLayoutToInternalFormat(mockLayout);
    expect(convertedLayout.components).toEqual(expectedComponentResult.components);
    expect(Object.keys(convertedLayout.order).length).toEqual(4);
  });
});
