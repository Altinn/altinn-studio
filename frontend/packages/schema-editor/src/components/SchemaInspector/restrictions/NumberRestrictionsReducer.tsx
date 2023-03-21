import { NumberRestrictionsError } from '@altinn/schema-editor/types/index';
import { IntRestrictionKeys } from '@altinn/schema-model';
import type { Dict } from '@altinn/schema-model/src/lib/types';

type ChangeCallback = (restrictions: Dict) => void;

export enum NumberRestrictionsReducerActionType {
  setMin = 'setMin',
  setMax = 'setMax',
  setMaxIncl = 'setMaxIncl',
  setMinIncl = 'setMinIncl',
  setRestriction = 'setRestriction',
}

interface SetMinMaxInclusiveAction {
  type:
    | NumberRestrictionsReducerActionType.setMinIncl
    | NumberRestrictionsReducerActionType.setMaxIncl;
  value: boolean;
  changeCallback: ChangeCallback;
}

interface SetMinMaxAction {
  type: NumberRestrictionsReducerActionType.setMin | NumberRestrictionsReducerActionType.setMax;
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
  | SetMinMaxInclusiveAction
  | SetMinMaxAction
  | SetRestrictionAction;

export type NumberRestrictionsReducerState = {
  isInteger: boolean;
  isMinInclusive: boolean;
  isMaxInclusive: boolean;
  min?: number;
  max?: number;
  restrictions: { [restriction in IntRestrictionKeys]?: number };
  numberRestrictionsError: NumberRestrictionsError;
};

export const validateMinMax = (
  formatState: NumberRestrictionsReducerState
): NumberRestrictionsError => {
  const minMaxAreInclusive = formatState.isMaxInclusive && formatState.isMinInclusive;
  const minEqualMax = Number(formatState.min) === Number(formatState.max);
  if (minMaxAreInclusive && minEqualMax) {
    return NumberRestrictionsError.NoError;
  } else if (Number(formatState.min) >= Number(formatState.max)) {
    return NumberRestrictionsError.InvalidMaxMinValue;
  } else if (
    !formatState.isMaxInclusive &&
    !formatState.isMinInclusive &&
    formatState.isInteger &&
    formatState.min === formatState.max - 1
  ) {
    return NumberRestrictionsError.InvalidMaxMinValue;
  }
  return NumberRestrictionsError.NoError;
};

const setMinIncl = (state: NumberRestrictionsReducerState, action: SetMinMaxInclusiveAction) => {
  const { restrictions } = state;
  if (action.value) {
    state.isMinInclusive = true;
    const newInclMin = restrictions[IntRestrictionKeys.exclusiveMinimum];
    state.min = newInclMin;
    restrictions[IntRestrictionKeys.minimum] = newInclMin;
    restrictions[IntRestrictionKeys.exclusiveMinimum] = undefined;
  } else {
    state.isMinInclusive = false;
    const newExclMin = restrictions[IntRestrictionKeys.minimum];
    state.min = newExclMin;
    restrictions[IntRestrictionKeys.exclusiveMinimum] = newExclMin;
    restrictions[IntRestrictionKeys.minimum] = undefined;
  }
  state.numberRestrictionsError = validateMinMax(state);
};

const setMaxIncl = (state: NumberRestrictionsReducerState, action: SetMinMaxInclusiveAction) => {
  const { restrictions } = state;
  if (action.value) {
    state.isMaxInclusive = true;
    const newInclMax = restrictions[IntRestrictionKeys.exclusiveMaximum];
    state.max = newInclMax;
    restrictions[IntRestrictionKeys.maximum] = newInclMax;
    restrictions[IntRestrictionKeys.exclusiveMaximum] = undefined;
  } else {
    state.isMaxInclusive = false;
    const newExclMax = restrictions[IntRestrictionKeys.maximum];
    state.max = newExclMax;
    restrictions[IntRestrictionKeys.exclusiveMaximum] = newExclMax;
    restrictions[IntRestrictionKeys.maximum] = undefined;
  }
  state.numberRestrictionsError = validateMinMax(state);
};

const setMin = (state: NumberRestrictionsReducerState, action: SetMinMaxAction) => {
  const { value } = action;
  const key = state.isMinInclusive
    ? IntRestrictionKeys.minimum
    : IntRestrictionKeys.exclusiveMinimum;
  state.min = value;
  state.restrictions[key] = value;
  state.numberRestrictionsError = validateMinMax(state);
};

const setMax = (state: NumberRestrictionsReducerState, action: SetMinMaxAction) => {
  const { value } = action;
  const key = state.isMaxInclusive
    ? IntRestrictionKeys.maximum
    : IntRestrictionKeys.exclusiveMaximum;
  state.max = value;
  state.restrictions[key] = value;
  state.numberRestrictionsError = validateMinMax(state);
};

const setRestriction = (state: NumberRestrictionsReducerState, action: SetRestrictionAction) =>
  (state.restrictions[action.restriction] = action.value);

export const numberRestrictionsReducer = (
  state: NumberRestrictionsReducerState,
  action: NumberRestrictionsReducerAction
) => {
  switch (action.type) {
    case NumberRestrictionsReducerActionType.setMinIncl:
      setMinIncl(state, action);
      break;
    case NumberRestrictionsReducerActionType.setMaxIncl:
      setMaxIncl(state, action);
      break;
    case NumberRestrictionsReducerActionType.setMin:
      setMin(state, action);
      break;
    case NumberRestrictionsReducerActionType.setMax:
      setMax(state, action);
      break;
    case NumberRestrictionsReducerActionType.setRestriction:
      setRestriction(state, action);
  }
  action.changeCallback(state.restrictions);
  return state;
};
