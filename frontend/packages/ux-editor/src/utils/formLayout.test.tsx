import {
  convertFromLayoutToInternalFormat,
  convertInternalToLayoutFormat,
  extractChildrenFromGroup,
} from './formLayout';
import { ComponentType } from '../components';
import { IExternalComponent, IInternalLayout } from '../types/global';
import { BASE_CONTAINER_ID } from 'app-shared/constants';

describe('utils/formLayout', () => {
  let mockInternal: IInternalLayout;
  let mockLayout: IExternalComponent[];

  beforeEach(() => {
    mockInternal = {
      components: {
        '46882e2b-8097-4170-ad4c-32cdc156634e': {
          id: '46882e2b-8097-4170-ad4c-32cdc156634e',
          type: ComponentType.Header,
          itemType: 'COMPONENT',
          textResourceBindings: {
            title: 'ServiceName',
          },
          dataModelBindings: {},
          size: 'L',
        },
        'ede0b05d-2c53-4feb-bdd4-4c61b89bd729': {
          id: 'ede0b05d-2c53-4feb-bdd4-4c61b89bd729',
          type: ComponentType.Paragraph,
          itemType: 'COMPONENT',
          textResourceBindings: {
            title: 'ServiceName',
          },
          dataModelBindings: {},
        },
        'group-paragraph': {
          id: 'group-paragraph',
          type: ComponentType.Paragraph,
          itemType: 'COMPONENT',
          textResourceBindings: {
            title: 'ServiceName',
          },
          dataModelBindings: {},
        },
        'group-child-paragraph': {
          id: 'group-child-paragraph',
          type: ComponentType.Paragraph,
          itemType: 'COMPONENT',
          textResourceBindings: {
            title: 'ServiceName',
          },
          dataModelBindings: {},
        },
      },
      containers: {
        [BASE_CONTAINER_ID]: {
          index: 0,
          itemType: 'CONTAINER',
        },
        'group-container': {
          dataModelBindings: {},
          itemType: 'CONTAINER',
        },
        'group-child-container': {
          dataModelBindings: {},
          itemType: 'CONTAINER',
        },
      },
      order: {
        [BASE_CONTAINER_ID]: [
          '46882e2b-8097-4170-ad4c-32cdc156634e',
          'ede0b05d-2c53-4feb-bdd4-4c61b89bd729',
          'group-container',
        ],
        'group-container': ['group-paragraph', 'group-child-container'],
        'group-child-container': ['group-child-paragraph'],
      },
    };
    mockLayout = [
      {
        id: '17314adc-f75d-4a49-b726-242e2ae32ad2',
        type: ComponentType.Input,
        textResourceBindings: {
          title: 'Input',
        },
        dataModelBindings: {},
        required: false,
        readOnly: false,
      },
      {
        id: '68a15abf-3a55-4cc6-b9cc-9bfa5fe9b51a',
        type: ComponentType.Input,
        textResourceBindings: {
          title: 'Input',
        },
        dataModelBindings: {},
        required: false,
        readOnly: false,
      },
    ];
  });

  describe('convertFromLayoutToInternalFormat', () => {
    it('should convert to correct format', () => {
      const convertedLayout = convertFromLayoutToInternalFormat(mockLayout, false);
      const expectedResult: IInternalLayout = {
        components: {
          '17314adc-f75d-4a49-b726-242e2ae32ad2': {
            dataModelBindings: {},
            id: '17314adc-f75d-4a49-b726-242e2ae32ad2',
            itemType: 'COMPONENT',
            readOnly: false,
            required: false,
            textResourceBindings: {
              title: 'Input',
            },
            type: ComponentType.Input,
          },
          '68a15abf-3a55-4cc6-b9cc-9bfa5fe9b51a': {
            dataModelBindings: {},
            id: '68a15abf-3a55-4cc6-b9cc-9bfa5fe9b51a',
            itemType: 'COMPONENT',
            readOnly: false,
            required: false,
            textResourceBindings: {
              title: 'Input',
            },
            type: ComponentType.Input,
          },
        },
        containers: {
          [BASE_CONTAINER_ID]: {
            itemType: 'CONTAINER',
          }
        },
        order: {
          [BASE_CONTAINER_ID]: ['17314adc-f75d-4a49-b726-242e2ae32ad2', '68a15abf-3a55-4cc6-b9cc-9bfa5fe9b51a'],
        }
      };

      expect(convertedLayout.components).toEqual(expectedResult.components);
    });

    it('should initiate a form layout with a base container', () => {
      const convertedLayout = convertFromLayoutToInternalFormat(null, false);
      expect(Object.keys(convertedLayout.containers).length).toEqual(1);
      expect(Object.keys(convertedLayout.components).length).toEqual(0);
      expect(Object.keys(convertedLayout.order).length).toEqual(1);
    });

    it('if the element contains children, extractChildrenFromContainer should run', () => {
      mockLayout = [
        {
          id: 'mockChildID_1',
          type: ComponentType.Group,
          children: ['mockChildID_2'],
        },
        {
          id: 'mockChildID_3',
          type: ComponentType.Group,
          children: ['mockChildID_4', 'mockChildID_6'],
        },
        {
          id: 'mockChildID_2',
          type: ComponentType.Header,
          someProp: '2',
        },
        {
          id: 'mockChildID_4',
          type: ComponentType.Paragraph,
          someProp: '4',
        },
        {
          id: 'mockChildID_5',
          type: ComponentType.Dropdown,
          someProp: '5',
        },
        {
          id: 'mockChildID_6',
          type: ComponentType.Group,
          children: ['mockChildID_7'],
        },
        {
          id: 'mockChildID_7',
          type: ComponentType.Input,
          someProp: '7',
        },
      ];
      const expectedComponentResult: IInternalLayout = {
        containers: {
          mockChildID_1: { itemType: 'CONTAINER' },
          mockChildID_3: { itemType: 'CONTAINER' },
          mockChildID_6: { itemType: 'CONTAINER' },
        },
        components: {
          mockChildID_2: {
            id: 'mockChildID_2',
            someProp: '2',
            type: ComponentType.Header,
            itemType: 'COMPONENT',
          },
          mockChildID_4: {
            id: 'mockChildID_4',
            someProp: '4',
            type: ComponentType.Paragraph,
            itemType: 'COMPONENT',
          },
          mockChildID_5: {
            id: 'mockChildID_5',
            someProp: '5',
            type: ComponentType.Dropdown,
            itemType: 'COMPONENT',
          },
          mockChildID_7: {
            id: 'mockChildID_7',
            someProp: '7',
            type: ComponentType.Input,
            itemType: 'COMPONENT',
          },
        },
        order: {
          [BASE_CONTAINER_ID]: ['mockChildID_1', 'mockChildID_3', 'mockChildID_5'],
          mockChildID_1: ['mockChildID_2'],
          mockChildID_3: ['mockChildID_4', 'mockChildID_6'],
          mockChildID_6: ['mockChildID_7'],
        }
      };

      const convertedLayout = convertFromLayoutToInternalFormat(mockLayout, false);
      expect(convertedLayout.components).toEqual(expectedComponentResult.components);
      expect(Object.keys(convertedLayout.order).length).toEqual(4);
    });
  });

  describe('convertInternalToLayoutFormat', () => {
    it('should convert to correct format', () => {
      const convertedLayout = convertInternalToLayoutFormat(mockInternal);
      const expectedResult = [
        {
          id: '46882e2b-8097-4170-ad4c-32cdc156634e',
          type: ComponentType.Header,
          textResourceBindings: { title: 'ServiceName' },
          dataModelBindings: {},
          size: 'L',
        },
        {
          id: 'ede0b05d-2c53-4feb-bdd4-4c61b89bd729',
          type: ComponentType.Paragraph,
          textResourceBindings: { title: 'ServiceName' },
          dataModelBindings: {},
        },
        {
          id: 'group-container',
          type: ComponentType.Group,
          dataModelBindings: {},
          children: ['group-paragraph', 'group-child-container'],
        },
        {
          id: 'group-paragraph',
          type: ComponentType.Paragraph,
          textResourceBindings: { title: 'ServiceName' },
          dataModelBindings: {},
        },
        {
          id: 'group-child-container',
          type: ComponentType.Group,
          dataModelBindings: {},
          children: ['group-child-paragraph'],
        },
        {
          id: 'group-child-paragraph',
          type: ComponentType.Paragraph,
          textResourceBindings: { title: 'ServiceName' },
          dataModelBindings: {},
        },
      ];
      expect(Array.isArray(convertedLayout)).toBe(true);
      expect(convertedLayout).toEqual(expectedResult);
    });
  });

  describe('extractChildrenFromGroup', () => {
    it('should return all children from a container', () => {
      const mockGroup: IExternalComponent = {
        id: 'mock-group-id',
        type: ComponentType.Group,
        children: ['mock-component-1', 'mock-component-2'],
      };
      const mockComponents: IExternalComponent[] = [
        {
          id: 'mock-component-1',
          type: ComponentType.Header,
          someProp: '1',
        },
        {
          id: 'mock-component-2',
          type: ComponentType.Paragraph,
          someProp: '2',
        },
      ];
      const mockConvertedLayout: IInternalLayout = {
        containers: {},
        components: {},
        order: {},
      };
      const expectedConvertedLayoutResult: IInternalLayout = {
        containers: { 'mock-group-id': { itemType: 'CONTAINER' } },
        components: {
          'mock-component-1': { someProp: '1', itemType: 'COMPONENT', type: ComponentType.Header, id: 'mock-component-1' },
          'mock-component-2': { someProp: '2', itemType: 'COMPONENT', type: ComponentType.Paragraph, id: 'mock-component-2' },
        },
        order: { 'mock-group-id': ['mock-component-1', 'mock-component-2'] },
      };
      extractChildrenFromGroup(mockGroup, mockComponents, mockConvertedLayout);
      expect(mockConvertedLayout).toEqual(expectedConvertedLayoutResult);
    });
  });
});
