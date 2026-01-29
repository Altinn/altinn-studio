import type { OptionList } from 'app-shared/types/OptionList';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { FormItem } from '../../../../../../types/FormItem';
import type { SelectionComponentType } from '../../../../../../types/FormComponent';
import {
  determineInitialTab,
  hasOptionListChanged,
  handleOptionsChange,
  resetComponentOptions,
  updateComponentOptionsId,
  updateComponentOptions,
  isOptionsIdReferenceId,
  hasStaticOptionList,
  hasEditableOptionList,
} from './optionsUtils';
import { componentMocks } from '../../../../../../testing/componentMocks';
import { OptionsTabKey } from '../enums/OptionsTabKey';
import { createPublishedCodeListReferenceString } from './published-code-list-reference-utils';

// Test data:
const mockedComponent: FormItem<SelectionComponentType> =
  componentMocks[ComponentType.RadioButtons];
const orgName = 'org';

describe('optionsUtils', () => {
  describe('determineInitialTab', () => {
    it('should return CodeList if both options and optionsId are set', () => {
      const optionsId = 'codeListId';
      const options: OptionList = [{ label: 'label1', value: 'value1' }];
      const idsFromAppLibrary = [optionsId];
      const component = { ...mockedComponent, options, optionsId };
      const result = determineInitialTab(component, { idsFromAppLibrary, orgName });
      expect(result).toEqual(OptionsTabKey.CodeList);
    });

    it('should return CodeList if options is not set and optionsId is in optionListIdsFromLibrary', () => {
      const optionsId = 'codeListId';
      const options = undefined;
      const idsFromAppLibrary = [optionsId];
      const component = { ...mockedComponent, options, optionsId };
      const result = determineInitialTab(component, { idsFromAppLibrary, orgName });
      expect(result).toEqual(OptionsTabKey.CodeList);
    });

    it('should return Reference if options is not set and optionsId is not in optionListIdsFromLibrary', () => {
      const optionsId = 'codeListId';
      const options = undefined;
      const idsFromAppLibrary = ['anotherCodeListId'];
      const component = { ...mockedComponent, options, optionsId };
      const result = determineInitialTab(component, { idsFromAppLibrary, orgName });
      expect(result).toEqual(OptionsTabKey.Reference);
    });

    it('should return CodeList if neither options or optionsId are provided', () => {
      const optionsId = '';
      const options = undefined;
      const component = { ...mockedComponent, options, optionsId };
      const result = determineInitialTab(component, { idsFromAppLibrary: [], orgName });
      expect(result).toEqual(OptionsTabKey.CodeList);
    });

    it('should return CodeList if options is set and optionsId is not set', () => {
      const optionsId = undefined;
      const options = [{ label: 'label1', value: 'value1' }];
      const idsFromAppLibrary = ['codeListId'];
      const component = { ...mockedComponent, options, optionsId };
      const result = determineInitialTab(component, { idsFromAppLibrary, orgName });
      expect(result).toEqual(OptionsTabKey.CodeList);
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
      const idsFromAppLibrary: string[] = ['test1', 'test2'];
      const optionsId: string = 'test1';
      const options = undefined;
      const component: typeof mockedComponent = { ...mockedComponent, optionsId, options };
      expect(hasStaticOptionList({ idsFromAppLibrary, orgName }, component)).toEqual(true);
    });

    it('should return true if options is set on the component', () => {
      const idsFromAppLibrary: string[] = [];
      const optionsId = '';
      const options: OptionList = [];
      const component: typeof mockedComponent = { ...mockedComponent, optionsId, options };
      expect(hasStaticOptionList({ idsFromAppLibrary, orgName }, component)).toEqual(true);
    });

    it('should return false if options ID and options are undefined', () => {
      const idsFromAppLibrary: string[] = ['test1', 'test2'];
      const optionsId = undefined;
      const options: OptionList = undefined;
      const component: typeof mockedComponent = { ...mockedComponent, optionsId, options };
      expect(hasStaticOptionList({ idsFromAppLibrary, orgName }, component)).toEqual(false);
    });

    it('should return false if options ID is not from library', () => {
      const idsFromAppLibrary: string[] = ['test1', 'test2'];
      const optionsId = 'another-id';
      const options: OptionList = undefined;
      const component: typeof mockedComponent = { ...mockedComponent, optionsId, options };
      expect(hasStaticOptionList({ idsFromAppLibrary, orgName }, component)).toEqual(false);
    });
  });

  describe('hasEditableOptionList', () => {
    it('Returns true when options are set directly', () => {
      const options: OptionList = [{ label: 'label1', value: 'value1' }];
      const component = { ...mockedComponent, options, optionsId: undefined };
      expect(hasEditableOptionList(component, { idsFromAppLibrary: [], orgName })).toBe(true);
    });

    it('Returns true when a code list from the app library is selected', () => {
      const optionsId = 'test';
      const component = { ...mockedComponent, options: undefined, optionsId };
      expect(hasEditableOptionList(component, { idsFromAppLibrary: [optionsId], orgName })).toBe(
        true,
      );
    });

    it('Returns true when a published code list is selected', () => {
      const codeListName = 'name';
      const version = '1';
      const optionsId = createPublishedCodeListReferenceString({ orgName, codeListName, version });
      const component = { ...mockedComponent, options: undefined, optionsId };
      expect(hasEditableOptionList(component, { idsFromAppLibrary: [], orgName })).toBe(true);
    });

    it('Returns false when a custom code list ID is selected', () => {
      const optionsId = 'custom-id';
      const component = { ...mockedComponent, options: undefined, optionsId };
      expect(hasEditableOptionList(component, { idsFromAppLibrary: [], orgName })).toBe(false);
    });

    it('Returns false when neither options nor optionsId are set', () => {
      const component = { ...mockedComponent, options: undefined, optionsId: undefined };
      expect(hasEditableOptionList(component, { idsFromAppLibrary: [], orgName })).toBe(false);
    });
  });
});
