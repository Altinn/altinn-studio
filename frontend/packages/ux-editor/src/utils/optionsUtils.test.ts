import { SelectedOptionsType } from '../components/config/editModal/EditOptions/EditOptions';
import type { IOption } from '../types/global';
import {
  getSelectedOptionsType,
  componentUsesDynamicCodeList,
  getOptionsPropertyKey,
} from './optionsUtils';

describe('getSelectedOptionsType', () => {
  it('should return SelectedOptionsType.Unknown if both options and optionsId are set', () => {
    const codeListId = 'codeListId';
    const options: IOption[] = [{ label: 'label1', value: 'value1' }];
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

describe('getOptionsPropertyKey', () => {
  it('should return optionsId if selected options type is Codelist', () => {
    const result = getOptionsPropertyKey(SelectedOptionsType.CodeList);
    expect(result).toEqual('optionsId');
  });

  it('should return optionsId if selected options type is ReferenceId', () => {
    const result = getOptionsPropertyKey(SelectedOptionsType.ReferenceId);
    expect(result).toEqual('optionsId');
  });

  it('should return options if selected options type is Unknown', () => {
    const result = getOptionsPropertyKey(SelectedOptionsType.Unknown);
    expect(result).toEqual('options');
  });
});
