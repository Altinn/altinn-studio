import { expect } from '@jest/globals';
import {
  changeNameInPointer,
  createDefinitionPointer,
  createPropertyPointer,
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

describe('pointerUtils', () => {
  test('makePointerFromArray', () => {
    expect(makePointerFromArray(['properties', 'hello'])).toBe('#/properties/hello');
    expect(makePointerFromArray(['#/properties', 'hello'])).toBe('#/properties/hello');
  });

  describe('createPropertyPointer', () => {
    it('Creates a valid property pointer when the parent is a combination', () => {
      const result = createPropertyPointer(allOfNodeMock, 'hello');
      expect(result).toBe(allOfNodeMock.pointer + '/allOf/hello');
    });

    it('Creates a valid property pointer when the parent is an object field', () => {
      const result = createPropertyPointer(simpleParentNodeMock, 'hello');
      expect(result).toBe(simpleParentNodeMock.pointer + '/properties/hello');
    });

    it('Creates a valid property pointer when the parent is an array field', () => {
      const result = createPropertyPointer(simpleArrayMock, 'hello');
      expect(result).toBe(simpleArrayMock.pointer + '/items/properties/hello');
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
