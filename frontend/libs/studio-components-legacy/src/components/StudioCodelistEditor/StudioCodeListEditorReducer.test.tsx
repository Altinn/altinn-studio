import { ObjectUtils } from '@studio/pure-functions';
import { codeListWithTextResources } from './test-data/codeListWithTextResources';
import { textResources } from './test-data/textResources';
import { reducer, ReducerActionType } from './StudioCodeListEditorReducer';
import type { ReducerAction, ReducerState } from './StudioCodeListEditorReducer';
import { CodeListItemTextProperty } from './types/CodeListItemTextProperty';
import type { TextResource } from '../../types/TextResource';

// Test data:
const defaultState = {
  codeList: codeListWithTextResources,
  textResources: textResources,
};

const dispatch = (action: ReducerAction, state?: Partial<ReducerState>) => {
  return reducer(state ? { ...defaultState, ...state } : { ...defaultState }, action);
};

describe('StudioCodeListEditorReducer', () => {
  afterEach(jest.clearAllMocks);

  describe('SetCodeList', () => {
    it('should update state correctly', () => {
      const testCodeList = [{ value: 'test1', label: 'test2' }];
      const expectedState = { codeList: testCodeList, textResources: textResources };

      const state: ReducerState = dispatch({
        type: ReducerActionType.SetCodeList,
        codeList: testCodeList,
      });

      expect(state).toEqual(expectedState);
    });
  });

  describe('AddTextResource', () => {
    it('should update state correctly when adding text resource for label', () => {
      const textResource: TextResource = {
        id: 'newId',
        value: 'some test value',
      };
      const codeItemIndex = 1;
      const property = CodeListItemTextProperty.Label;

      const expectedState = ObjectUtils.deepCopy(defaultState);
      expectedState.codeList[codeItemIndex].label = textResource.id;
      expectedState.textResources.push(textResource);

      const state: ReducerState = dispatch({
        type: ReducerActionType.AddTextResource,
        textResource: textResource,
        codeItemIndex: codeItemIndex,
        property: property,
      });

      expect(state).toEqual(expectedState);
    });
  });

  describe('DeleteTextResource', () => {
    it('should update state correctly when deleting text resource for description', () => {
      const textResourceId: string = textResources[0].id;
      const codeItemIndex = 0;
      const property = CodeListItemTextProperty.Description;

      const expectedState = ObjectUtils.deepCopy(defaultState);
      expectedState.codeList[codeItemIndex].description = null;
      expectedState.textResources = textResources.filter((item) => item.id !== textResourceId);

      const state: ReducerState = dispatch({
        type: ReducerActionType.DeleteTextResource,
        textResourceId: textResourceId,
        codeItemIndex: codeItemIndex,
        property: property,
      });

      expect(state).toEqual(expectedState);
    });
  });

  describe('UpdateTextResourceId', () => {
    it('should update state correctly when altering text resourceId for helpText', () => {
      const textResourceId: string = textResources[2].id;
      const newId: string = 'newId';
      const codeItemIndex = 0;
      const property = CodeListItemTextProperty.HelpText;

      const expectedState = ObjectUtils.deepCopy(defaultState);
      expectedState.codeList[codeItemIndex].helpText = newId;
      const updatedTextResource: TextResource = ObjectUtils.deepCopy(textResources[2]);
      updatedTextResource.id = newId;
      expectedState.textResources[2] = updatedTextResource;

      const state: ReducerState = dispatch({
        type: ReducerActionType.UpdateTextResourceId,
        textResourceId: textResourceId,
        newId: newId,
        codeItemIndex: codeItemIndex,
        property: property,
      });

      expect(state).toEqual(expectedState);
    });
  });

  describe('UpdateTextResourceValue', () => {
    it('should update state correctly when altering text resource value for label', () => {
      const textResourceId: string = textResources[2].id;
      const newValue: string = 'test value';

      const expectedState = ObjectUtils.deepCopy(defaultState);
      const updatedTextResource: TextResource = ObjectUtils.deepCopy(textResources[2]);
      updatedTextResource.value = newValue;
      expectedState.textResources[2] = updatedTextResource;

      const state: ReducerState = dispatch({
        type: ReducerActionType.UpdateTextResourceValue,
        textResourceId: textResourceId,
        newValue: newValue,
      });

      expect(state).toEqual(expectedState);
    });
  });
});
