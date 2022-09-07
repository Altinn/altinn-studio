import { FieldType, UiSchemaItem } from '../types';
import {
  isNameInUse,
  isPathOnDefinitionsRoot,
  isPathOnPropertiesRoot,
  isValidName,
} from './checks';

describe('checksUtils', () => {
  test('should not be possible to have two properties with the same name', () => {
    const uiSchemaItems: UiSchemaItem[] = [
      {
        path: '#/definitions/name',
        type: FieldType.Object,
        properties: [
          {
            path: '#/definitions/name/properties/child1',
            type: FieldType.String,
            displayName: 'child1',
          },
          {
            path: '#/definitions/name/properties/child2',
            type: FieldType.String,
            displayName: 'child2',
          },
        ],
        displayName: 'name',
      },
      {
        path: '#/definitions/name2',
        type: FieldType.Object,
        properties: [
          {
            path: '#/definitions/name/properties/child1',
            type: FieldType.String,
            displayName: 'child21',
          },
          {
            path: '#/definitions/name/properties/child2',
            type: FieldType.String,
            displayName: 'child22',
          },
        ],
        displayName: 'name2',
      },
    ];

    expect(
      isNameInUse({
        uiSchemaItems: uiSchemaItems,
        parentSchema: uiSchemaItems[0],
        path: '#/definitions/name',
        name: 'name',
      }),
    ).toBe(false);
    expect(
      isNameInUse({
        uiSchemaItems: uiSchemaItems,
        parentSchema: uiSchemaItems[0],
        path: '#/definitions/name/properties/child1',
        name: 'child2',
      }),
    ).toBe(true);
    expect(
      isNameInUse({
        uiSchemaItems: uiSchemaItems,
        parentSchema: uiSchemaItems[0],
        path: '#/definitions/name/properties/child2',
        name: 'child3',
      }),
    ).toBe(false);
    expect(
      isNameInUse({
        uiSchemaItems: uiSchemaItems,
        parentSchema: null,
        path: '#/properties/name',
        name: 'name2',
      }),
    ).toBe(true);
    expect(
      isNameInUse({
        uiSchemaItems: uiSchemaItems,
        parentSchema: null,
        path: '#/properties/name4',
        name: 'name4',
      }),
    ).toBe(false);
    expect(
      isNameInUse({
        uiSchemaItems: uiSchemaItems,
        parentSchema: null,
        path: '#/definitions/name',
        name: 'name2',
      }),
    ).toBe(true);
    expect(
      isNameInUse({
        uiSchemaItems: uiSchemaItems,
        parentSchema: null,
        path: '#/definitions/name4',
        name: 'name4',
      }),
    ).toBe(false);
  });

  test('validates that the name only contains legal characters', () => {
    expect(isValidName('Melding')).toBe(true);
    expect(isValidName('melding')).toBe(true);
    expect(isValidName('melding1')).toBe(true);
    expect(isValidName('melding.1')).toBe(true);
    expect(isValidName('melding_xyz')).toBe(true);
    expect(isValidName('melding-xyz')).toBe(true);
    expect(isValidName('1melding')).toBe(false);
    expect(isValidName('_melding')).toBe(false);
    expect(isValidName('.melding')).toBe(false);
    expect(isValidName('melding%')).toBe(false);
  });

  test('should match if a properties based path is on root', () => {
    expect(isPathOnPropertiesRoot('#/properties/prop1')).toBe(true);
    expect(isPathOnPropertiesRoot('#/properties/prop1/properties/prop2')).toBe(
      false,
    );
  });

  test('should match if a definitions based path is on root', () => {
    expect(isPathOnDefinitionsRoot('#/definitions/prop1')).toBe(true);
    expect(
      isPathOnDefinitionsRoot('#/definitions/prop1/properties/prop2'),
    ).toBe(false);
    expect(isPathOnDefinitionsRoot('#/$defs/prop1')).toBe(true);
    expect(isPathOnDefinitionsRoot('#/$defs/prop1/properties/prop2')).toBe(
      false,
    );
  });
});
