import { isOptionsIdReferenceId, isOptionsModifiable } from './utils';
import type { Option } from 'app-shared/types/Option';

// Test-data:
const optionListIds = ['some-id'];

describe('Utils functions', () => {
  describe('IsOptionsIdReferenceId', () => {
    it('should return true if options ID is a string and options ID is not from library', () => {
      const optionsId = 'another-id';
      expect(isOptionsIdReferenceId(optionListIds, optionsId)).toBe(true);
    });

    it('should return false if options is undefined', () => {
      const optionsId = undefined;
      expect(isOptionsIdReferenceId(optionListIds, optionsId)).toBe(false);
    });

    it('should return false if options ID is from library', () => {
      const optionsId = 'some-id';
      expect(isOptionsIdReferenceId(optionListIds, optionsId)).toBe(false);
    });
  });

  describe('isOptionsModifiable', () => {
    it('should return true if options ID is a string and options ID is from library', () => {
      const optionsId = 'some-id';
      const options: Option[] = [{ value: 'value', label: 'label' }];
      expect(isOptionsModifiable(optionListIds, optionsId, options)).toBe(true);
    });

    it('should return true if options is set on the component', () => {
      const optionsId = '';
      const options: Option[] = [];
      expect(isOptionsModifiable([], optionsId, options)).toBe(true);
    });

    it('should return false if options ID is undefined', () => {
      const optionsId = undefined;
      const options: Option[] = undefined;
      expect(isOptionsModifiable(optionListIds, optionsId, options)).toBe(false);
    });

    it('should return false if options ID is not from library', () => {
      const optionsId = 'another-id';
      const options: Option[] = undefined;
      expect(isOptionsModifiable(optionListIds, optionsId, options)).toBe(false);
    });
  });
});
