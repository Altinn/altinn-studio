import { useValidateFileName } from './useValidateFileName';
import { renderHook } from '@testing-library/react';

const optionListIdOne = 'one';
const optionListIdTwo = 'two';
const optionLists: string[] = [optionListIdOne];
const result = renderHook(() => useValidateFileName(optionLists)).result.current;

describe('validateFileNameUtils', () => {
  it('should return true for valid filename', () => {
    expect(result.validateFileName(optionListIdTwo + '.json')).toBe(true);
  });

  it('should return false for invalid filename', () => {
    jest.spyOn(window, 'alert').mockImplementation(() => {});
    expect(result.validateFileName('_test.json')).toBe(false);
    expect(window.alert).toHaveBeenCalled();
  });

  it('should return true for duplicate found', () => {
    expect(result.getDuplicatedOptionIds(optionLists, optionListIdOne)).toBe(true);
  });

  it('should return false for new value', () => {
    expect(result.getDuplicatedOptionIds(optionLists, optionListIdTwo)).toBe(false);
  });
});
