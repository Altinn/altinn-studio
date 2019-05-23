import 'jest';
import {
  convertFromLayoutToInternalFormat,
  convertInternalToLayoutFormat,
  getParentContainerId,
} from '../../src/utils/formLayout';

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
        type: 'Input',
        itemType: 'COMPONENT',
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
      itemType: 'COMPONENT',
      textResourceBindings: { title: 'ServiceName' },
      dataModelBindings: {},
      size: 'L',
    },
    {
      id: 'ede0b05d-2c53-4feb-bdd4-4c61b89bd729',
      type: 'Paragraph',
      itemType: 'COMPONENT',
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
          itemType: 'COMPONENT',
          textResourceBindings: {
            title: 'ServiceName',
          },
          dataModelBindings: {},
          size: 'L',
        },
        'ede0b05d-2c53-4feb-bdd4-4c61b89bd729': {
          component: 'Paragraph',
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
    const mockResult = [
      {
        id: '46882e2b-8097-4170-ad4c-32cdc156634e',
        type: 'Header',
        itemType: 'COMPONENT',
        textResourceBindings: {
          title: 'ServiceName',
        },
        dataModelBindings: {},
        size: 'L',
      },
      {
        id: 'ede0b05d-2c53-4feb-bdd4-4c61b89bd729',
        type: 'Paragraph',
        itemType: 'COMPONENT',
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
});
