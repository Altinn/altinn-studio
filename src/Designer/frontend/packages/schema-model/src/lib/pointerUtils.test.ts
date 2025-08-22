import { expect } from '@jest/globals';
import {
  changeNameInPointer,
  createDefinitionPointer,
  createPropertyPointer,
  extractCategoryFromPointer,
  extractNameFromPointer,
  makePointerFromArray,
} from './pointerUtils';
import {
  allOfNodeMock,
  referenceNodeMock,
  simpleArrayMock,
  simpleParentNodeMock,
  stringNodeMock,
} from '../../test/uiSchemaMock';
import { CombinationKind, Keyword } from '@altinn/schema-model/types';

describe('pointerUtils', () => {
  test('makePointerFromArray', () => {
    expect(makePointerFromArray(['properties', 'hello'])).toBe('#/properties/hello');
    expect(makePointerFromArray(['#/properties', 'hello'])).toBe('#/properties/hello');
  });

  describe('createPropertyPointer', () => {
    it('Creates a valid property pointer when the parent is a combination', () => {
      const result = createPropertyPointer(allOfNodeMock, 'hello');
      expect(result).toBe(allOfNodeMock.schemaPointer + '/allOf/hello');
    });

    it('Creates a valid property pointer when the parent is an object field', () => {
      const result = createPropertyPointer(simpleParentNodeMock, 'hello');
      expect(result).toBe(simpleParentNodeMock.schemaPointer + '/properties/hello');
    });

    it('Creates a valid property pointer when the parent is an array field', () => {
      const result = createPropertyPointer(simpleArrayMock, 'hello');
      expect(result).toBe(simpleArrayMock.schemaPointer + '/items/properties/hello');
    });

    it('Throws an error when the parent is a reference', () => {
      expect(() => createPropertyPointer(referenceNodeMock, 'hello')).toThrowError();
    });

    it('Throws an error when the parent is a field node, but not an object nor an array', () => {
      expect(() => createPropertyPointer(stringNodeMock, 'hello')).toThrowError();
    });
  });

  describe('createDefinitionPointer', () => {
    it('Creates a valid definition pointer', () => {
      const result = createDefinitionPointer('hello');
      expect(result).toBe('#/$defs/hello');
    });
  });

  describe('extractNameFromPointer', () => {
    it('Extracts the name from a pointer', () => {
      expect(extractNameFromPointer('#/$defs/hello')).toBe('hello');
      expect(extractNameFromPointer('#/properties/hello')).toBe('hello');
      expect(extractNameFromPointer('#/properties/hello/anyOf/world')).toBe('world');
      expect(extractNameFromPointer('#')).toBe('#');
    });

    it('Returns an empty string when an empty string is passed', () => {
      expect(extractNameFromPointer('')).toBe('');
    });
  });

  describe('extractCategoryFromPointer', () => {
    it('Returns "properties" when the pointer is a property pointer', () => {
      expect(extractCategoryFromPointer('#/properties/hello')).toBe(Keyword.Properties);
      expect(extractCategoryFromPointer('#/anyOf/hello/properties/world')).toBe(Keyword.Properties);
      expect(extractCategoryFromPointer('#/$defs/test/properties/hello')).toBe(Keyword.Properties);
    });

    it('Returns the combination kind when the pointer is a combination pointer', () => {
      expect(extractCategoryFromPointer('#/allOf/0')).toBe(CombinationKind.AllOf);
      expect(extractCategoryFromPointer('#/properties/test/anyOf/1')).toBe(CombinationKind.AnyOf);
      expect(extractCategoryFromPointer('#/allOf/test/oneOf/2')).toBe(CombinationKind.OneOf);
      expect(extractCategoryFromPointer('#/$defs/test/anyOf/3')).toBe(CombinationKind.AnyOf);
    });

    it('Returns "$defs" when the pointer is a definition pointer', () => {
      expect(extractCategoryFromPointer('#/$defs/test')).toBe(Keyword.Definitions);
    });

    it('Returns undefined when the pointer is the root pointer', () => {
      expect(extractCategoryFromPointer('#')).toBe(undefined);
    });
  });

  describe('changeNameInPointer', () => {
    it('Changes the last part of the pointer', () => {
      expect(changeNameInPointer('#/$defs/hello', 'world')).toBe('#/$defs/world');
      expect(changeNameInPointer('#/properties/hello', 'world')).toBe('#/properties/world');
      expect(changeNameInPointer('#/properties/hello/anyOf/hello', 'world')).toBe(
        '#/properties/hello/anyOf/world',
      );
    });
  });
});
