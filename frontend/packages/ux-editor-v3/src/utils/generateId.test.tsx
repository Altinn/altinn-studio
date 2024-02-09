import type { IFormLayouts } from '../types/global';
import { generateComponentId, generateTextResourceId } from './generateId';
import { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';

describe('generateComponentId', () => {
  const layouts: IFormLayouts = {
    layout1: {
      containers: {
        container1: {
          id: 'container1',
          index: 0,
          itemType: 'CONTAINER',
          type: ComponentTypeV3.Group,
        },
      },
      components: {
        'Input-1bd34': {
          id: 'Input-1bd34',
          type: ComponentTypeV3.Input,
          itemType: 'COMPONENT',
          dataModelBindings: {},
        },
      },
      order: {
        container1: ['Input-1bd34'],
      },
      customRootProperties: {},
      customDataProperties: {},
    },
    layout2: {
      containers: {
        container2: {
          id: 'container2',
          index: 0,
          itemType: 'CONTAINER',
          type: ComponentTypeV3.Group,
        },
      },
      components: {
        'Input-abfr34': {
          id: 'Input-abfr34',
          type: ComponentTypeV3.Input,
          itemType: 'COMPONENT',
          dataModelBindings: {},
        },
      },
      order: {
        container2: ['Input-abfr34'],
      },
      customRootProperties: {},
      customDataProperties: {},
    },
  };
  it('should generate unique component id within provided layouts', () => {
    const newId = generateComponentId(ComponentTypeV3.Input, layouts);
    expect(newId.startsWith('Input')).toBeTruthy();
    expect(layouts.layout1.components[newId]).toBeUndefined();
    expect(layouts.layout2.components[newId]).toBeUndefined();
  });

  it('should generate unique component id for group component', () => {
    const newId = generateComponentId(ComponentTypeV3.Group, layouts);
    expect(newId.startsWith('Group')).toBeTruthy();
    expect(layouts.layout1.containers[newId]).toBeUndefined();
    expect(layouts.layout2.containers[newId]).toBeUndefined();
  });
});

describe('generateTextResourceId', () => {
  it('should generate expected text resource ID from provided input', () => {
    const generatedId = generateTextResourceId('page1', 'test-component', 'title');
    expect(generatedId).toEqual('page1.test-component.title');
  });
});
