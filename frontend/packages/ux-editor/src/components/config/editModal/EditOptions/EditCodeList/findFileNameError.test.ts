import { findFileNameError } from './findFileNameError';

const optionListIdOne = 'one';
const optionLists: string[] = [optionListIdOne];

const validFilename = 'two.json';
const invalidFilename = '_InvalidFileName.json';

describe('findFileNameError', () => {
  it('should return null for valid filename', () => {
    expect(findFileNameError(optionLists, validFilename)).toBe(null);
  });

  it('should return "invalidFileName" for invalid filename', () => {
    expect(findFileNameError(optionLists, invalidFilename)).toBe('invalidFileName');
  });

  it('should return "fileExists" for duplicate filename', () => {
    expect(findFileNameError(optionLists, optionListIdOne + '.json')).toBe('fileExists');
  });
});
