import { codeListWithStrings } from './test-data/codeListWithStrings';
import { textResources } from './test-data/textResources';
import type { ReducerAction, ReducerState } from './StudioCodeListEditorReducer';
import { reducer, ReducerActionType } from './StudioCodeListEditorReducer';
import { CodeListItemTextProperty } from './types/CodeListItemTextProperty';
import type { TextResource } from '../../types/TextResource';
import type { CodeListWithTextResources } from './types/CodeListWithTextResources';

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
      const testCodeList: CodeListWithTextResources = [{ value: 'test1', label: 'test2' }];

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
