import { useValidateFileName } from './useValidateFileName';

const optionIdOne = 'one';
const optionIdTwo = 'two';
const options: string[] = [optionIdOne];

const { validateFileName, getDuplicatedOptionIds } = useValidateFileName(options);
describe('validateFileNameUtils', () => {
  it('should return true for valid filename', () => {
    expect(validateFileName(optionIdTwo + '.json')).toBe(true);
  });

  it('should return false for invalid filename', () => {
    jest.spyOn(window, 'alert').mockImplementation(() => {});
    expect(validateFileName('_test.json')).toBe(false);
    expect(window.alert).toHaveBeenCalled();
  });

  it('should return true for duplicate found', () => {
    expect(getDuplicatedOptionIds(options, optionIdOne)).toBe(true);
  });

  it('should return false for new value', () => {
    expect(getDuplicatedOptionIds(options, optionIdTwo)).toBe(false);
  });
});
