import type { TextResource } from '../../types/TextResource';
import type { CodeListWithTextResources } from './types/CodeListWithTextResources';
import type { CodeListItemTextProperty } from './types/CodeListItemTextProperty';
import { updateCodeList } from './utils';
import { TextResourceUtils } from '@studio/pure-functions';

export type ReducerState = {
  codeList: CodeListWithTextResources;
  textResources?: TextResource[];
};

export enum ReducerActionType {
  SetCodeList = 'SetCodeList',
  SetTextResources = 'SetTextResources',
  AddTextResource = 'AddTextResource',
  UpdateTextResourceValue = 'UpdateTextResourceValue',
}

type SetCodeListAction = {
  type: ReducerActionType.SetCodeList;
  codeList: CodeListWithTextResources;
};

type SetTextResourcesAction = {
  type: ReducerActionType.SetTextResources;
  textResources: TextResource[];
};

type AddTextResourceAction = {
  type: ReducerActionType.AddTextResource;
  textResource: TextResource;
  codeItemIndex: number;
  property: CodeListItemTextProperty;
};

type UpdateTextResourceValueAction = {
  type: ReducerActionType.UpdateTextResourceValue;
  textResourceId: string;
  newValue: string;
};

export type ReducerAction =
  | SetCodeListAction
  | SetTextResourcesAction
  | AddTextResourceAction
  | UpdateTextResourceValueAction;

export function reducer(state: ReducerState, action: ReducerAction): ReducerState {
  switch (action.type) {
    case ReducerActionType.SetCodeList:
      return setCodeList(state, action);
    case ReducerActionType.SetTextResources:
      return setTextResources(state, action);
    case ReducerActionType.AddTextResource:
      return addTextResource(state, action);
    case ReducerActionType.UpdateTextResourceValue:
      return updateTextResourceValue(state, action);
  }
}

function setCodeList(state: ReducerState, action: SetCodeListAction): ReducerState {
  return {
    ...state,
    codeList: action.codeList,
  };
}

function setTextResources(state: ReducerState, action: SetTextResourcesAction): ReducerState {
  return {
    ...state,
    textResources: action.textResources,
  };
}

function addTextResource(state: ReducerState, action: AddTextResourceAction): ReducerState {
  const updatedCodeList: CodeListWithTextResources = addTextResourceToCodeList(
    state.codeList,
    action,
  );
  const updatedTextResources: TextResource[] = TextResourceUtils.fromArray(state.textResources)
    .set(action.textResource)
    .asArray();
  return { textResources: updatedTextResources, codeList: updatedCodeList };
}

function updateTextResourceValue(
  state: ReducerState,
  action: UpdateTextResourceValueAction,
): ReducerState {
  const updatedTextResource = textResourceFromUpdateAction(action);
  const updatedList = TextResourceUtils.fromArray(state.textResources)
    .set(updatedTextResource)
    .asArray();
  return { ...state, textResources: updatedList };
}

const textResourceFromUpdateAction = (action: UpdateTextResourceValueAction): TextResource => ({
  id: action.textResourceId,
  value: action.newValue,
});

function addTextResourceToCodeList(
  codeList: CodeListWithTextResources,
  action: AddTextResourceAction,
): CodeListWithTextResources {
  const { textResource, property, codeItemIndex } = action;
  return updateCodeList(codeList, { newValue: textResource.id, codeItemIndex, property });
}
