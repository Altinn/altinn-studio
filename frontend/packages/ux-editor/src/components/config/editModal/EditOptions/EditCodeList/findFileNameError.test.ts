import { findFileNameError } from './findFileNameError';

const optionListIdOne = 'one';
const optionLists: string[] = [optionListIdOne];

const validFilename = 'two.json';
const invalidFilename = '_InvalidFileName.json';

describe('validateFileName', () => {
  it('should return true for valid filename', () => {
    expect(findFileNameError(optionLists, validFilename)).toBe(null);
  });

  it('should return false for invalid filename', () => {
    expect(findFileNameError(optionLists, invalidFilename)).toBe('invalidFileName');
  });

  it('should return false for duplicate filename', () => {
    expect(findFileNameError(optionLists, optionListIdOne + '.json')).toBe('fileExists');
  });
});
