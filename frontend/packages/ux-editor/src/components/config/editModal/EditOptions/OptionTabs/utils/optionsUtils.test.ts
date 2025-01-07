import { SelectedOptionsType } from '../../../../../../components/config/editModal/EditOptions/EditOptions';
import type { OptionsList } from 'app-shared/types/api/OptionsLists';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { FormItem } from '../../../../../../types/FormItem';
import type { SelectionComponentType } from '../../../../../../types/FormComponent';
import {
  getSelectedOptionsType,
  getSelectedOptionsTypeWithManualSupport,
  componentUsesDynamicCodeList,
  hasOptionListChanged,
  handleOptionsChange,
  resetComponentOptions,
  updateComponentOptionsId,
  updateComponentOptions,
  isOptionsIdReferenceId,
  isOptionsModifiable,
  isInitialOptionsSet,
} from './optionsUtils';
import { componentMocks } from '../../../../../../testing/componentMocks';
import { optionListIdsMock } from '@altinn/ux-editor/testing/mocks';

// Test data:
const mockedComponent: FormItem<SelectionComponentType> =
  componentMocks[ComponentType.RadioButtons];

describe('optionsUtils', () => {
  describe('getSelectedOptionsType', () => {
    it('should return SelectedOptionsType.Unknown if both options and optionsId are set', () => {
      const codeListId = 'codeListId';
      const options: OptionsList = [{ label: 'label1', value: 'value1' }];
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

  describe('getSelectedOptionsTypeWithManualSupport', () => {
    it('should return SelectedOptionsType.Unknown if both options and optionsId are set', () => {
      const codeListId = 'codeListId';
      const options: OptionsList = [{ label: 'label1', value: 'value1' }];
      const optionListIds = ['codeListId'];
      const result = getSelectedOptionsTypeWithManualSupport(codeListId, options, optionListIds);
      expect(result).toEqual(SelectedOptionsType.Unknown);
    });

    it('should return SelectedOptionsType.CodeList if options is not set and codeListId is in optionListIds', () => {
      const codeListId = 'codeListId';
      const options = undefined;
      const optionListIds = [codeListId];
      const result = getSelectedOptionsTypeWithManualSupport(codeListId, options, optionListIds);
      expect(result).toEqual(SelectedOptionsType.CodeList);
    });

    it('should return SelectedOptionsType.ReferenceId if options is not set and codeListId is not in optionListIds', () => {
      const codeListId = 'codeListId';
      const options = undefined;
      const optionListIds = ['anotherCodeListId'];
      const result = getSelectedOptionsTypeWithManualSupport(codeListId, options, optionListIds);
      expect(result).toEqual(SelectedOptionsType.ReferenceId);
    });

    it('should return SelectedOptionsType.Manual if options is set and codeListId is not set', () => {
      const codeListId = undefined;
      const options = [{ label: 'label1', value: 'value1' }];
      const optionListIds = ['anotherCodeListId'];
      const result = getSelectedOptionsTypeWithManualSupport(codeListId, options, optionListIds);
      expect(result).toEqual(SelectedOptionsType.Manual);
    });

    it('should return SelectedOptionsType.Manual if options is set and codeListId is not set, even if options has length 0', () => {
      const codeListId = undefined;
      const options = [];
      const optionListIds = ['codeListId'];
      const result = getSelectedOptionsTypeWithManualSupport(codeListId, options, optionListIds);
      expect(result).toEqual(SelectedOptionsType.Manual);
    });

    it('should use default value for optionListIds if it is not provided', () => {
      const codeListId = '';
      const options = undefined;
      const result = getSelectedOptionsTypeWithManualSupport(codeListId, options);
      expect(result).toEqual(SelectedOptionsType.CodeList);
    });
  });

  describe('componentUsesDynamicCodeList', () => {
    it('should return false if codeListId is set to an empty string', () => {
      const codeListId = '';
      const optionListIds = ['codeListId'];
      const result = componentUsesDynamicCodeList(codeListId, optionListIds);
      expect(result).toEqual(false);
    });

    it('should return false if codeListId is in optionListIds', () => {
      const codeListId = 'codeListId';
      const optionListIds = [codeListId];
      const result = componentUsesDynamicCodeList(codeListId, optionListIds);
      expect(result).toEqual(false);
    });

    it('should return true if codeListId is not in optionListIds', () => {
      const codeListId = 'codeListId';
      const optionListIds = ['anotherCodeListId'];
      const result = componentUsesDynamicCodeList(codeListId, optionListIds);
      expect(result).toEqual(true);
    });
  });

  describe('hasOptionListChanged', () => {
    it('should return false if the optionList has not changed', () => {
      const oldOptions: OptionsList = [{ label: 'label1', value: 'value1' }];
      const newOptions: OptionsList = [{ label: 'label1', value: 'value1' }];
      const result = hasOptionListChanged(oldOptions, newOptions);
      expect(result).toEqual(false);
    });

    it('should return true if the optionList has changed', () => {
      const oldOptions: OptionsList = [{ label: 'label1', value: 'value1' }];
      const newOptions: OptionsList = [{ label: 'new label', value: 'new value' }];
      const result = hasOptionListChanged(oldOptions, newOptions);
      expect(result).toEqual(true);
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
      const options: OptionsList = [{ label: 'new-label', value: 'new-value' }];
      expect(updateComponentOptions(mockedComponent, options)).toStrictEqual({
        ...mockedComponent,
        optionsId: undefined,
        options,
      });
    });
  });

  describe('IsOptionsIdReferenceId', () => {
    it('should return true if options ID is a string and options ID is not from library', () => {
      const optionsId = 'another-id';
      const optionListIds: string[] = optionListIdsMock;
      expect(isOptionsIdReferenceId(optionListIds, optionsId)).toBe(true);
    });

    it('should return false if options is undefined', () => {
      const optionsId = undefined;
      const optionListIds: string[] = optionListIdsMock;
      expect(isOptionsIdReferenceId(optionListIds, optionsId)).toBe(false);
    });

    it('should return false if options ID is from library', () => {
      const optionListIds: string[] = optionListIdsMock;
      const optionsId: string = optionListIds[0];
      expect(isOptionsIdReferenceId(optionListIds, optionsId)).toBe(false);
    });
  });

  describe('isOptionsModifiable', () => {
    it('should return true if options ID is a string and options ID is from library', () => {
      const optionListIds: string[] = optionListIdsMock;
      const optionsId: string = optionListIds[0];
      const options: OptionsList = [{ value: 'value', label: 'label' }];
      expect(isOptionsModifiable(optionListIds, optionsId, options)).toBe(true);
    });

    it('should return true if options is set on the component', () => {
      const optionListIds: string[] = [];
      const optionsId = '';
      const options: OptionsList = [];
      expect(isOptionsModifiable(optionListIds, optionsId, options)).toBe(true);
    });

    it('should return false if options ID and options are undefined', () => {
      const optionListIds: string[] = optionListIdsMock;
      const optionsId = undefined;
      const options: OptionsList = undefined;
      expect(isOptionsModifiable(optionListIds, optionsId, options)).toBe(false);
    });

    it('should return false if options ID is not from library', () => {
      const optionListIds: string[] = optionListIdsMock;
      const optionsId = 'another-id';
      const options: OptionsList = undefined;
      expect(isOptionsModifiable(optionListIds, optionsId, options)).toBe(false);
    });
  });

  describe('isInitialOptionsSet', () => {
    it('should return true if previousOptions is false and currentOptions is truthy', () => {
      const previousOptions = undefined;
      const currentOptions: OptionsList = [];
      expect(isInitialOptionsSet(previousOptions, currentOptions)).toBe(true);
    });

    it('should return false if previousOptions is truthy', () => {
      const previousOptions = [];
      const currentOptions: OptionsList = [{ value: 'value', label: 'label' }];
      expect(isInitialOptionsSet(previousOptions, currentOptions)).toBe(false);
    });

    it('should return false if currentOptions is undefined', () => {
      const previousOptions = [];
      const currentOptions = undefined;

      expect(isInitialOptionsSet(previousOptions, currentOptions)).toBe(false);
    });
  });
});
