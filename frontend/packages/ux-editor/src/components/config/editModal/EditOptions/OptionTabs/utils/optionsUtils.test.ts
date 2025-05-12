import { SelectedOptionsType } from '../../../../../../components/config/editModal/EditOptions/EditOptions';
import type { OptionList } from 'app-shared/types/OptionList';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { FormItem } from '../../../../../../types/FormItem';
import type { SelectionComponentType } from '../../../../../../types/FormComponent';
import {
  getSelectedOptionsType,
  hasOptionListChanged,
  handleOptionsChange,
  resetComponentOptions,
  updateComponentOptionsId,
  updateComponentOptions,
  isOptionsIdReferenceId,
  hasStaticOptionList,
  isInitialOptionsSet,
} from './optionsUtils';
import { componentMocks } from '../../../../../../testing/componentMocks';

// Test data:
const mockedComponent: FormItem<SelectionComponentType> =
  componentMocks[ComponentType.RadioButtons];

describe('optionsUtils', () => {
  describe('getSelectedOptionsType', () => {
    it('should return SelectedOptionsType.Unknown if both options and optionsId are set', () => {
      const codeListId = 'codeListId';
      const options: OptionList = [{ label: 'label1', value: 'value1' }];
      const optionListIds = ['codeListId'];
      const result = getSelectedOptionsType(codeListId, options, optionListIds);
      expect(result).toEqual(SelectedOptionsType.Unknown);
    });

    it('should return SelectedOptionsType.CodeList if options is not set and codeListId is in optionListIds', () => {
      const codeListId = 'codeListId';
      const options = undefined;
      const optionListIds = [codeListId];
      const result = getSelectedOptionsType(codeListId, options, optionListIds);
      expect(result).toEqual(SelectedOptionsType.CodeList);
    });

    it('should return SelectedOptionsType.ReferenceId if options is not set and codeListId is not in optionListIds', () => {
      const codeListId = 'codeListId';
      const options = undefined;
      const optionListIds = ['anotherCodeListId'];
      const result = getSelectedOptionsType(codeListId, options, optionListIds);
      expect(result).toEqual(SelectedOptionsType.ReferenceId);
    });

    it('should use default value for optionListIds if it is not provided', () => {
      const codeListId = '';
      const options = undefined;
      const result = getSelectedOptionsType(codeListId, options);
      expect(result).toEqual(SelectedOptionsType.CodeList);
    });

    it('should return SelectedOptionsType.CodeList if options is set and codeListId is not set', () => {
      const codeListId = undefined;
      const options = [{ label: 'label1', value: 'value1' }];
      const optionListIds = ['codeListId'];
      const result = getSelectedOptionsType(codeListId, options, optionListIds);
      expect(result).toEqual(SelectedOptionsType.CodeList);
    });
  });

  describe('hasOptionListChanged', () => {
    it('should return false if the optionList has not changed', () => {
      const oldOptions: OptionList = [{ label: 'label1', value: 'value1' }];
      const newOptions: OptionList = [{ label: 'label1', value: 'value1' }];
      expect(hasOptionListChanged(oldOptions, newOptions)).toEqual(false);
    });

    it('should return true if the optionList has changed', () => {
      const oldOptions: OptionList = [{ label: 'label1', value: 'value1' }];
      const newOptions: OptionList = [{ label: 'new label', value: 'new value' }];
      expect(hasOptionListChanged(oldOptions, newOptions)).toEqual(true);
    });
  });

  describe('handleOptionsChange', () => {
    it('should call handleComponentChange with the updated component', () => {
      const handleComponentChange = jest.fn();
      handleOptionsChange({ ...mockedComponent }, handleComponentChange);
      expect(handleComponentChange).toHaveBeenCalledTimes(1);
      expect(handleComponentChange).toHaveBeenCalledWith(mockedComponent);
    });
  });

  describe('resetComponentOptions', () => {
    it('should set options ID and options on the returned object to undefined', () => {
      expect(resetComponentOptions({ ...mockedComponent })).toStrictEqual({
        ...mockedComponent,
        options: undefined,
        optionsId: undefined,
      });
    });
  });

  describe('updateComponentOptionsId', () => {
    it('should update options ID on the returned object', () => {
      const optionsId: string = 'new-id';
      expect(updateComponentOptionsId(mockedComponent, optionsId)).toStrictEqual({
        ...mockedComponent,
        optionsId,
        options: undefined,
      });
    });
  });

  describe('updateComponentOptions', () => {
    it('should update options on the returned object', () => {
      const options: OptionList = [{ label: 'new-label', value: 'new-value' }];
      expect(updateComponentOptions(mockedComponent, options)).toStrictEqual({
        ...mockedComponent,
        optionsId: undefined,
        options,
      });
    });
  });

  describe('IsOptionsIdReferenceId', () => {
    it('should return true if options ID is a string and options ID is not from library', () => {
      const optionListIds: string[] = ['test1', 'test2'];
      const optionsId = 'another-id';
      expect(isOptionsIdReferenceId(optionListIds, optionsId)).toEqual(true);
    });

    it('should return false if options is undefined', () => {
      const optionListIds: string[] = ['test1', 'test2'];
      const optionsId = undefined;
      expect(isOptionsIdReferenceId(optionListIds, optionsId)).toEqual(false);
    });

    it('should return false if options ID is from library', () => {
      const optionListIds: string[] = ['test1', 'test2'];
      const optionsId: string = 'test1';
      expect(isOptionsIdReferenceId(optionListIds, optionsId)).toEqual(false);
    });
  });

  describe('hasStaticOptionList', () => {
    it('should return true if options ID is a string and options ID is from library', () => {
      const optionListIds: string[] = ['test1', 'test2'];
      const optionsId: string = 'test1';
      const options: OptionList = [{ value: 'value', label: 'label' }];
      expect(hasStaticOptionList(optionListIds, optionsId, options)).toEqual(true);
    });

    it('should return true if options is set on the component', () => {
      const optionListIds: string[] = [];
      const optionsId = '';
      const options: OptionList = [];
      expect(hasStaticOptionList(optionListIds, optionsId, options)).toEqual(true);
    });

    it('should return false if options ID and options are undefined', () => {
      const optionListIds: string[] = ['test1', 'test2'];
      const optionsId = undefined;
      const options: OptionList = undefined;
      expect(hasStaticOptionList(optionListIds, optionsId, options)).toEqual(false);
    });

    it('should return false if options ID is not from library', () => {
      const optionListIds: string[] = ['test1', 'test2'];
      const optionsId = 'another-id';
      const options: OptionList = undefined;
      expect(hasStaticOptionList(optionListIds, optionsId, options)).toEqual(false);
    });
  });

  describe('isInitialOptionsSet', () => {
    it('should return true if previousOptions is false and currentOptions is truthy', () => {
      const previousOptions = undefined;
      const currentOptions: OptionList = [];
      expect(isInitialOptionsSet(previousOptions, currentOptions)).toEqual(true);
    });

    it('should return false if previousOptions is truthy', () => {
      const previousOptions = [];
      const currentOptions: OptionList = [{ value: 'value', label: 'label' }];
      expect(isInitialOptionsSet(previousOptions, currentOptions)).toEqual(false);
    });

    it('should return false if currentOptions is undefined', () => {
      const previousOptions = [];
      const currentOptions = undefined;

      expect(isInitialOptionsSet(previousOptions, currentOptions)).toEqual(false);
    });
  });
});
