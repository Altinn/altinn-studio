import { codeListWithStrings } from './test-data/codeListWithStrings';
import { textResources } from './test-data/textResources';
import type { ReducerAction, ReducerState } from './StudioCodeListEditorReducer';
import { reducer, ReducerActionType } from './StudioCodeListEditorReducer';
import { CodeListItemTextProperty } from './types/CodeListItemTextProperty';
import type { TextResource } from '../../types/TextResource';
import type { CodeList } from './types/CodeList';

// Test data:
const defaultState = {
  codeList: codeListWithStrings,
  textResources: textResources,
};

const dispatch = (action: ReducerAction, state?: Partial<ReducerState>): ReducerState => {
  return reducer({ ...defaultState, ...state }, action);
};

describe('StudioCodeListEditorReducer', () => {
  describe('SetCodeList', () => {
    it('Updates the list of code list items', () => {
      const testCodeList: CodeList = [{ value: 'test1', label: 'test2' }];

      const result: ReducerState = dispatch({
        type: ReducerActionType.SetCodeList,
        codeList: testCodeList,
      });

      expect(result.codeList).toEqual(testCodeList);
    });
  });

  describe('setTextResources', () => {
    it('Updates the list of text resources', () => {
      const testTextResources: TextResource[] = [{ id: 'test1', value: 'test2' }];

      const result: ReducerState = dispatch({
        type: ReducerActionType.SetTextResources,
        textResources: testTextResources,
      });

      expect(result.textResources).toEqual(testTextResources);
    });
  });

  describe('AddTextResource', () => {
    const textResource: TextResource = {
      id: 'newId',
      value: 'some test value',
    };
    const codeItemIndex = 1;
    const property = CodeListItemTextProperty.Label;

    const result: ReducerState = dispatch({
      type: ReducerActionType.AddTextResource,
      textResource,
      codeItemIndex,
      property,
    });

    it('Adds the new text resource to the list of text resources', () => {
      expect(result.textResources).toContain(textResource);
    });

    it('Updates the given code item property with a reference to the new text resource', () => {
      const updatedTextProperty = result.codeList[codeItemIndex][property];
      expect(updatedTextProperty).toContain(textResource.id);
    });
  });

  describe('DeleteTextResource', () => {
    const textResourceId: string = textResources[0].id;
    const codeItemIndex = 0;
    const property = CodeListItemTextProperty.Description;

    const result: ReducerState = dispatch({
      type: ReducerActionType.DeleteTextResource,
      textResourceId,
      codeItemIndex,
      property,
    });

    it('Removes a text resource from the list of text resources', () => {
      expect(result.textResources).not.toContain(textResources[0]);
    });

    it('Updates the given code item property with the value null', () => {
      expect(result.codeList[codeItemIndex].description).toBeNull();
    });
  });

  describe('UpdateTextResourceId', () => {
    const textResource: TextResource = textResources[2];
    const textResourceId: string = textResource.id;
    const newId: string = 'newId';
    const codeItemIndex = 0;
    const property = CodeListItemTextProperty.HelpText;

    const result: ReducerState = dispatch({
      type: ReducerActionType.UpdateTextResourceId,
      textResourceId,
      newId,
      codeItemIndex,
      property,
    });

    it('Updates the id property of a text resource in the list of text resources', () => {
      expect(result.textResources).not.toContain(textResource);
      expect(result.textResources.find((item) => item.id === newId)).toBeTruthy();
    });

    it('Updates the correct code item in the list with a reference to the updated text resource', () => {
      expect(result.codeList[codeItemIndex].helpText).toEqual(newId);
    });
  });

  describe('UpdateTextResourceValue', () => {
    it('Updates the value property of a text resource in the list of text resources', () => {
      const textResourceId: string = textResources[2].id;
      const newValue: string = 'test value';

      const result: ReducerState = dispatch({
        type: ReducerActionType.UpdateTextResourceValue,
        textResourceId,
        newValue,
      });

      const actualTextResource = result.textResources.find((item) => item.id === textResourceId);
      expect(actualTextResource.value).toEqual(newValue);
    });
  });
});
