import { validateFileName } from './validateFileNameUtils';

const optionListIdOne = 'one';
const optionLists: string[] = [optionListIdOne];

const validFilename = 'two.json';
const invalidFilename = '_InvalidFileName.json';

describe('validateFileName', () => {
  it('should return true for valid filename', () => {
    expect(validateFileName(optionLists, validFilename)).toBe(true);
  });

  it('should return false for invalid filename', () => {
    expect(validateFileName(optionLists, invalidFilename)).toBe(false);
  });

  it('should return false for duplicate filename', () => {
    expect(validateFileName(optionLists, optionListIdOne + '.json')).toBe(false);
  });
});
