import { IntRestrictionKeys } from '@altinn/schema-model';
import type { Dict } from '@altinn/schema-model/src/lib/types';

type ChangeCallback = (restrictions: Dict) => void;

export enum NumberRestrictionsReducerActionType {
  setSmallest = 'setSmallest',
  setBiggest = 'setBiggest',
  setMaxIncl = 'setMaxIncl',
  setMinIncl = 'setMinIncl',
  setRestriction = 'setRestriction',
}

interface SetInclAction {
  type:
    | NumberRestrictionsReducerActionType.setMinIncl
    | NumberRestrictionsReducerActionType.setMaxIncl;
  value: boolean;
  changeCallback: ChangeCallback;
}

interface SetSmallestOrBiggestAction {
  type:
    | NumberRestrictionsReducerActionType.setSmallest
    | NumberRestrictionsReducerActionType.setBiggest;
  value: number;
  changeCallback: ChangeCallback;
}

interface SetRestrictionAction {
  type: NumberRestrictionsReducerActionType.setRestriction;
  restriction: IntRestrictionKeys;
  value: number;
  changeCallback: ChangeCallback;
}

export type NumberRestrictionsReducerAction =
  | SetInclAction
  | SetSmallestOrBiggestAction
  | SetRestrictionAction;

export type NumberRestrictionReducerState = {
  smallestIsInclusive: boolean;
  biggestIsInclusive: boolean;
  smallest: number;
  biggest: number;
  restrictions: {
    [restriction in IntRestrictionKeys]?: number;
  };
};

const setMinIncl = (state: NumberRestrictionReducerState, action: SetInclAction) => {
  const { restrictions } = state;
  if (action.value) {
    state.smallestIsInclusive = true;
    const newInclMin = restrictions[IntRestrictionKeys.exclusiveMinimum];
    state.smallest = newInclMin;
    restrictions[IntRestrictionKeys.minimum] = newInclMin;
    restrictions[IntRestrictionKeys.exclusiveMinimum] = undefined;
  } else {
    state.smallestIsInclusive = false;
    const newExclMin = restrictions[IntRestrictionKeys.minimum];
    state.smallest = newExclMin;
    restrictions[IntRestrictionKeys.exclusiveMinimum] = newExclMin;
    restrictions[IntRestrictionKeys.minimum] = undefined;
  }
};

const setMaxIncl = (state: NumberRestrictionReducerState, action: SetInclAction) => {
  const { restrictions } = state;
  if (action.value) {
    state.biggestIsInclusive = true;
    const newInclMax = restrictions[IntRestrictionKeys.exclusiveMaximum];
    state.biggest = newInclMax;
    restrictions[IntRestrictionKeys.maximum] = newInclMax;
    restrictions[IntRestrictionKeys.exclusiveMaximum] = undefined;
  } else {
    state.biggestIsInclusive = false;
    const newExclMax = restrictions[IntRestrictionKeys.maximum];
    state.biggest = newExclMax;
    restrictions[IntRestrictionKeys.exclusiveMaximum] = newExclMax;
    restrictions[IntRestrictionKeys.maximum] = undefined;
  }
};

const setSmallest = (state: NumberRestrictionReducerState, action: SetSmallestOrBiggestAction) => {
  const { value } = action;
  const key = state.smallestIsInclusive
    ? IntRestrictionKeys.minimum
    : IntRestrictionKeys.exclusiveMinimum;
  state.smallest = value;
  state.restrictions[key] = value;
};

const setBiggest = (state: NumberRestrictionReducerState, action: SetSmallestOrBiggestAction) => {
  const { value } = action;
  const key = state.biggestIsInclusive
    ? IntRestrictionKeys.maximum
    : IntRestrictionKeys.exclusiveMaximum;
  state.biggest = value;
  state.restrictions[key] = value;
};

const setRestriction = (state: NumberRestrictionReducerState, action: SetRestrictionAction) =>
  (state.restrictions[action.restriction] = action.value);

export const numberRestrictionsReducer = (
  state: NumberRestrictionReducerState,
  action: NumberRestrictionsReducerAction
) => {
  switch (action.type) {
    case NumberRestrictionsReducerActionType.setMinIncl:
      setMinIncl(state, action);
      break;
    case NumberRestrictionsReducerActionType.setMaxIncl:
      setMaxIncl(state, action);
      break;
    case NumberRestrictionsReducerActionType.setSmallest:
      setSmallest(state, action);
      break;
    case NumberRestrictionsReducerActionType.setBiggest:
      setBiggest(state, action);
      break;
    case NumberRestrictionsReducerActionType.setRestriction:
      setRestriction(state, action);
  }
  action.changeCallback(state.restrictions);
  return state;
};

export default numberRestrictionsReducer;
