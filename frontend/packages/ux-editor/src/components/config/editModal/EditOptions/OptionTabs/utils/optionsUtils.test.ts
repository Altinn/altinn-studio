import { SelectedOptionsType } from '../../../../../../components/config/editModal/EditOptions/EditOptions';
import type { Option } from 'app-shared/types/Option';
import {
  getSelectedOptionsType,
  getSelectedOptionsTypeWithManualSupport,
  componentUsesDynamicCodeList,
  hasOptionListChanged,
} from './optionsUtils';

describe('getSelectedOptionsType', () => {
  it('should return SelectedOptionsType.Unknown if both options and optionsId are set', () => {
    const codeListId = 'codeListId';
    const options: Option[] = [{ label: 'label1', value: 'value1' }];
    const optionListIds = ['codeListId'];
    const result = getSelectedOptionsType(codeListId, options, optionListIds);
    expect(result).toEqual(SelectedOptionsType.Unknown);
  });

  it('should return SelectedOptionsType.CodeList if options is not set and codeListId is in optionListIds', () => {
    const codeListId = 'codeListId';
    const options = undefined;
    const optionListIds = ['codeListId'];
    const result = getSelectedOptionsType(codeListId, options, optionListIds);
    expect(result).toEqual('codelist');
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
    const optionListIds = ['anotherCodeListId'];
    const result = getSelectedOptionsType(codeListId, options, optionListIds);
    expect(result).toEqual(SelectedOptionsType.CodeList);
  });
});

describe('getSelectedOptionsTypeV1', () => {
  it('should return SelectedOptionsType.Unknown if both options and optionsId are set', () => {
    const codeListId = 'codeListId';
    const options: Option[] = [{ label: 'label1', value: 'value1' }];
    const optionListIds = ['codeListId'];
    const result = getSelectedOptionsTypeWithManualSupport(codeListId, options, optionListIds);
    expect(result).toEqual(SelectedOptionsType.Unknown);
  });

  it('should return SelectedOptionsType.CodeList if options is not set and codeListId is in optionListIds', () => {
    const codeListId = 'codeListId';
    const options = undefined;
    const optionListIds = ['codeListId'];
    const result = getSelectedOptionsTypeWithManualSupport(codeListId, options, optionListIds);
    expect(result).toEqual('codelist');
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
    const optionListIds = ['anotherCodeListId'];
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
  it('should return false if codeListId is not set', () => {
    const codeListId = '';
    const optionListIds = ['codeListId'];
    const result = componentUsesDynamicCodeList(codeListId, optionListIds);
    expect(result).toEqual(false);
  });

  it('should return false if codeListId is in optionListIds', () => {
    const codeListId = 'codeListId';
    const optionListIds = ['codeListId'];
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
    const oldOptions: Option[] = [{ label: 'label1', value: 'value1' }];
    const newOptions: Option[] = [{ label: 'label1', value: 'value1' }];
    const result = hasOptionListChanged(oldOptions, newOptions);
    expect(result).toEqual(false);
  });

  it('should return true if the optionList has changed', () => {
    const oldOptions: Option[] = [{ label: 'label1', value: 'value1' }];
    const newOptions: Option[] = [{ label: 'new label', value: 'new value' }];
    const result = hasOptionListChanged(oldOptions, newOptions);
    expect(result).toEqual(true);
  });
});
