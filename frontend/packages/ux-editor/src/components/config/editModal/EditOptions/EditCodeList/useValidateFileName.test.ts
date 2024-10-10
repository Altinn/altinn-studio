import { useValidateFileName } from './useValidateFileName';
import { renderHook } from '@testing-library/react';

const optionIdOne = 'one';
const optionIdTwo = 'two';
const options: string[] = [optionIdOne];
const result = renderHook(() => useValidateFileName(options)).result.current;

describe('validateFileNameUtils', () => {
  it('should return true for valid filename', () => {
    expect(result.validateFileName(optionIdTwo + '.json')).toBe(true);
  });

  it('should return false for invalid filename', () => {
    jest.spyOn(window, 'alert').mockImplementation(() => {});
    expect(result.validateFileName('_test.json')).toBe(false);
    expect(window.alert).toHaveBeenCalled();
  });

  it('should return true for duplicate found', () => {
    expect(result.getDuplicatedOptionIds(options, optionIdOne)).toBe(true);
  });

  it('should return false for new value', () => {
    expect(result.getDuplicatedOptionIds(options, optionIdTwo)).toBe(false);
  });
});
