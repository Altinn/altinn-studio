import type { TextResource } from '../../types/TextResource';
import type { CodeList } from './types/CodeList';
import type { CodeListItemTextProperty } from './types/CodeListItemTextProperty';
import { updateCodeList } from './utils';

export type ReducerState = {
  codeList: CodeList;
  textResources?: TextResource[];
};

export enum ReducerActionType {
  SetCodeList = 'SetCodeList',
  SetTextResources = 'SetTextResources',
  AddTextResource = 'AddTextResource',
  DeleteTextResource = 'DeleteTextResource',
  UpdateTextResourceId = 'UpdateTextResourceId',
  UpdateTextResourceValue = 'UpdateTextResourceValue',
}

type SetCodeListAction = {
  type: ReducerActionType.SetCodeList;
  codeList: CodeList;
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

type DeleteTextResourceAction = {
  type: ReducerActionType.DeleteTextResource;
  textResourceId: string;
  codeItemIndex: number;
  property: CodeListItemTextProperty;
};

type UpdateTextResourceIdAction = {
  type: ReducerActionType.UpdateTextResourceId;
  textResourceId: string;
  newId: string;
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
  | DeleteTextResourceAction
  | UpdateTextResourceIdAction
  | UpdateTextResourceValueAction;

export function reducer(state: ReducerState, action: ReducerAction): ReducerState {
  switch (action.type) {
    case ReducerActionType.SetCodeList:
      return setCodeList(state, action);
    case ReducerActionType.SetTextResources:
      return setTextResources(state, action);
    case ReducerActionType.AddTextResource:
      return addTextResource(state, action);
    case ReducerActionType.DeleteTextResource:
      return deleteTextResource(state, action);
    case ReducerActionType.UpdateTextResourceId:
      return updateTextResourceId(state, action);
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
  const updatedCodeList: CodeList = addTextResourceToCodeList(state.codeList, action);
  const updatedTextResources: TextResource[] = addTextResourceToList(
    state.textResources,
    action.textResource,
  );
  return {
    textResources: updatedTextResources,
    codeList: updatedCodeList,
  };
}

function deleteTextResource(state: ReducerState, action: DeleteTextResourceAction): ReducerState {
  const updatedCodeList: CodeList = deleteTextResourceFromCodeList(state.codeList, action);
  const updatedTextResources: TextResource[] = deleteTextResourceFromList(
    state.textResources,
    action.textResourceId,
  );
  return {
    textResources: updatedTextResources,
    codeList: updatedCodeList,
  };
}

function updateTextResourceId(
  state: ReducerState,
  action: UpdateTextResourceIdAction,
): ReducerState {
  const updatedCodeList: CodeList = updateTextResourceIdInCodeList(state.codeList, action);
  const updatedTextResources: TextResource[] = updateTextResourceIdInList(
    state.textResources,
    action,
  );
  return {
    textResources: updatedTextResources,
    codeList: updatedCodeList,
  };
}

function updateTextResourceValue(
  state: ReducerState,
  action: UpdateTextResourceValueAction,
): ReducerState {
  const updatedTextResources: TextResource[] = updateTextResourceValueInList(
    state.textResources,
    action,
  );
  return {
    ...state,
    textResources: updatedTextResources,
  };
}

function addTextResourceToCodeList(codeList: CodeList, action: AddTextResourceAction): CodeList {
  const { textResource, property, codeItemIndex } = action;
  return updateCodeList(codeList, { newValue: textResource.id, codeItemIndex, property });
}

function addTextResourceToList(
  textResources: TextResource[],
  textResource: TextResource,
): TextResource[] {
  return [...textResources, textResource];
}

function deleteTextResourceFromCodeList(
  codeList: CodeList,
  action: DeleteTextResourceAction,
): CodeList {
  const { codeItemIndex, property } = action;
  return updateCodeList(codeList, { newValue: null, codeItemIndex, property });
}

function deleteTextResourceFromList(
  textResources: TextResource[],
  textResourceId: string,
): TextResource[] {
  return textResources.filter((item: TextResource) => item.id !== textResourceId);
}

function updateTextResourceIdInCodeList(
  codeList: CodeList,
  action: UpdateTextResourceIdAction,
): CodeList {
  const { newId, codeItemIndex, property } = action;
  return updateCodeList(codeList, { newValue: newId, codeItemIndex, property });
}

function updateTextResourceIdInList(
  textResources: TextResource[],
  action: UpdateTextResourceIdAction,
): TextResource[] {
  const { newId, textResourceId } = action;
  const newTextResources = [...textResources];

  const indexOfTextResource: number = newTextResources.findIndex(
    (item: TextResource): boolean => item.id === textResourceId,
  );
  const oldItem = newTextResources[indexOfTextResource];
  newTextResources[indexOfTextResource] = { ...oldItem, id: newId };

  return newTextResources;
}

function updateTextResourceValueInList(
  textResources: TextResource[],
  action: UpdateTextResourceValueAction,
): TextResource[] {
  const { textResourceId, newValue } = action;
  const newTextResources = [...textResources];

  const indexOfTextResource: number = newTextResources.findIndex(
    (item: TextResource): boolean => item.id === textResourceId,
  );
  const oldItem = newTextResources[indexOfTextResource];
  newTextResources[indexOfTextResource] = { ...oldItem, value: newValue };

  return newTextResources;
}
