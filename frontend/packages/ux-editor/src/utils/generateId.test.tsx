import { IFormLayout } from '../types/global';
import { generateComponentId, generateTextResourceId } from './generateId';

describe('generateComponentId', () => {
  const layout: IFormLayout = {
    containers: {
      container: {
        index: 0,
        itemType: 'CONTAINER',
      },
    },
    components: {
      'Input-1bd34': {
        id: 'Input-1bd34',
        type: 'Input',
      },
    },
    order: {
      container: ['Input-1bd34'],
    },
  };
  it('should generate unique component id within provided layout', () => {
    const newId = generateComponentId('Input', layout);
    expect(newId.startsWith('Input')).toBeTruthy();
    expect(layout.components[newId]).toBeUndefined();
  });
});

describe('generateTextResourceId', () => {
  it('should generate expected text resource ID from provided input', () => {
    const generatedId = generateTextResourceId('page1', 'test-component', 'title');
    expect(generatedId).toEqual('page1-test-component-title');
  });
});
