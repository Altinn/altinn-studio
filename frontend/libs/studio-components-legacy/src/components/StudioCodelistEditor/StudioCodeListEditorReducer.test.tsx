import { codeListWithTextResources } from './test-data/codeListWithTextResources';
import { textResources } from './test-data/textResources';
import type { ReducerAction, ReducerState } from './StudioCodeListEditorReducer';
import { reducer, ReducerActionType } from './StudioCodeListEditorReducer';
import { CodeListItemTextProperty } from './types/CodeListItemTextProperty';
import type { TextResource } from '../../types/TextResource';
import type { CodeList } from './types/CodeList';

// Test data:
const defaultState = {
  codeList: codeListWithTextResources,
  textResources: textResources,
};

const dispatch = (action: ReducerAction, state?: Partial<ReducerState>): ReducerState => {
  return reducer({ ...defaultState, ...state }, action);
};

describe('StudioCodeListEditorReducer', () => {
  describe('SetCodeList', () => {
    it('should update codeList property in state correctly', () => {
      const testCodeList: CodeList = [{ value: 'test1', label: 'test2' }];

      const state: ReducerState = dispatch({
        type: ReducerActionType.SetCodeList,
        codeList: testCodeList,
      });

      expect(state.codeList).toEqual(testCodeList);
    });
  });

  describe('setTextResources', () => {
    it('should update textResources property in state correctly', () => {
      const testTextResources: TextResource[] = [{ id: 'test1', value: 'test2' }];

      const state: ReducerState = dispatch({
        type: ReducerActionType.SetTextResources,
        textResources: testTextResources,
      });

      expect(state.textResources).toEqual(testTextResources);
    });
  });

  describe('AddTextResource', () => {
    it('should update textResources property in state correctly when adding text resource for label', () => {
      const textResource: TextResource = {
        id: 'newId',
        value: 'some test value',
      };
      const codeItemIndex = 1;
      const property = CodeListItemTextProperty.Label;

      const state: ReducerState = dispatch({
        type: ReducerActionType.AddTextResource,
        textResource: textResource,
        codeItemIndex: codeItemIndex,
        property: property,
      });

      expect(state.textResources[state.textResources.length - 1]).toEqual(textResource);
    });

    it('should update codeList property in state correctly when adding text resource for label', () => {
      const textResource: TextResource = {
        id: 'newId',
        value: 'some test value',
      };
      const codeItemIndex = 1;
      const property = CodeListItemTextProperty.Label;

      const state: ReducerState = dispatch({
        type: ReducerActionType.AddTextResource,
        textResource: textResource,
        codeItemIndex: codeItemIndex,
        property: property,
      });

      expect(state.codeList[codeItemIndex].label).toEqual(textResource.id);
    });
  });

  describe('DeleteTextResource', () => {
    it('should update textResources property in state correctly when deleting text resource for description', () => {
      const textResourceId: string = textResources[0].id;
      const codeItemIndex = 0;
      const property = CodeListItemTextProperty.Description;

      const state: ReducerState = dispatch({
        type: ReducerActionType.DeleteTextResource,
        textResourceId: textResourceId,
        codeItemIndex: codeItemIndex,
        property: property,
      });

      expect(state.textResources.find((item) => item.id === textResourceId)).toBeFalsy();
    });

    it('should update codeList property in state correctly when deleting text resource for description', () => {
      const textResourceId: string = textResources[0].id;
      const codeItemIndex = 0;
      const property = CodeListItemTextProperty.Description;

      const state: ReducerState = dispatch({
        type: ReducerActionType.DeleteTextResource,
        textResourceId: textResourceId,
        codeItemIndex: codeItemIndex,
        property: property,
      });

      expect(state.codeList[codeItemIndex].description).toBeNull();
    });
  });

  describe('UpdateTextResourceId', () => {
    it('should update textResources property in state correctly when altering text resourceId for helpText', () => {
      const textResourceId: string = textResources[2].id;
      const newId: string = 'newId';
      const codeItemIndex = 0;
      const property = CodeListItemTextProperty.HelpText;

      const state: ReducerState = dispatch({
        type: ReducerActionType.UpdateTextResourceId,
        textResourceId: textResourceId,
        newId: newId,
        codeItemIndex: codeItemIndex,
        property: property,
      });

      expect(state.textResources.find((item) => item.id === textResourceId)).toBeFalsy();
      expect(state.textResources.find((item) => item.id === newId)).toBeTruthy();
    });

    it('should update textResources property in state correctly when altering text resourceId for helpText', () => {
      const textResourceId: string = textResources[2].id;
      const newId: string = 'newId';
      const codeItemIndex = 0;
      const property = CodeListItemTextProperty.HelpText;

      const state: ReducerState = dispatch({
        type: ReducerActionType.UpdateTextResourceId,
        textResourceId: textResourceId,
        newId: newId,
        codeItemIndex: codeItemIndex,
        property: property,
      });

      expect(state.codeList[codeItemIndex].helpText).toEqual(newId);
    });
  });

  describe('UpdateTextResourceValue', () => {
    it('should update textResources property in state correctly when altering text resource value', () => {
      const textResourceId: string = textResources[2].id;
      const newValue: string = 'test value';

      const state: ReducerState = dispatch({
        type: ReducerActionType.UpdateTextResourceValue,
        textResourceId: textResourceId,
        newValue: newValue,
      });

      expect(state.textResources.find((item) => item.id === textResourceId).value).toEqual(
        newValue,
      );
    });
  });
});
