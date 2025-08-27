import { NumberRestrictionsError } from '@altinn/schema-editor/types';
import { IntRestrictionKey } from '@altinn/schema-model/index';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';

type ChangeCallback = (restrictions: KeyValuePairs) => void;

export enum NumberRestrictionsReducerActionType {
  setMin = 'setMin',
  setMax = 'setMax',
  setMaxIncl = 'setMaxIncl',
  setMinIncl = 'setMinIncl',
  setMultipleOf = 'setMultipleOf',
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

interface SetMultipleOf {
  type: NumberRestrictionsReducerActionType.setMultipleOf;
  value: number;
  changeCallback: ChangeCallback;
}

interface SetRestrictionAction {
  type: NumberRestrictionsReducerActionType.setRestriction;
  restriction: IntRestrictionKey;
  value: number;
  changeCallback: ChangeCallback;
}

export type NumberRestrictionsReducerAction =
  | SetMinMaxInclusiveAction
  | SetMinMaxAction
  | SetMultipleOf
  | SetRestrictionAction;

export type NumberRestrictionsReducerState = {
  isInteger: boolean;
  isMinInclusive: boolean;
  isMaxInclusive: boolean;
  min?: number;
  max?: number;
  restrictions: { [restriction in IntRestrictionKey]?: number };
  numberRestrictionsError: NumberRestrictionsError;
};

export const validateMinMax = (
  formatState: NumberRestrictionsReducerState,
): NumberRestrictionsError => {
  const areBothInclusive = formatState.isMinInclusive && formatState.isMaxInclusive;
  if (areBothInclusive && formatState.min > formatState.max) {
    return NumberRestrictionsError.MinMustBeLessThanOrEqualToMax;
  } else if (!areBothInclusive && formatState.min >= formatState.max) {
    return NumberRestrictionsError.MinMustBeLessThanMax;
  } else if (
    formatState.isInteger &&
    !formatState.isMinInclusive &&
    !formatState.isMaxInclusive &&
    formatState.min >= formatState.max - 1
  ) {
    return NumberRestrictionsError.IntervalMustBeLargeEnough;
  } else {
    return NumberRestrictionsError.NoError;
  }
};

const setMinIncl = (state: NumberRestrictionsReducerState, action: SetMinMaxInclusiveAction) => {
  const { restrictions } = state;
  if (action.value) {
    state.isMinInclusive = true;
    const newInclMin = restrictions[IntRestrictionKey.exclusiveMinimum];
    state.min = newInclMin;
    restrictions[IntRestrictionKey.minimum] = newInclMin;
    restrictions[IntRestrictionKey.exclusiveMinimum] = undefined;
  } else {
    state.isMinInclusive = false;
    const newExclMin = restrictions[IntRestrictionKey.minimum];
    state.min = newExclMin;
    restrictions[IntRestrictionKey.exclusiveMinimum] = newExclMin;
    restrictions[IntRestrictionKey.minimum] = undefined;
  }
  state.numberRestrictionsError = validateMinMax(state);
};

const setMaxIncl = (state: NumberRestrictionsReducerState, action: SetMinMaxInclusiveAction) => {
  const { restrictions } = state;
  if (action.value) {
    state.isMaxInclusive = true;
    const newInclMax = restrictions[IntRestrictionKey.exclusiveMaximum];
    state.max = newInclMax;
    restrictions[IntRestrictionKey.maximum] = newInclMax;
    restrictions[IntRestrictionKey.exclusiveMaximum] = undefined;
  } else {
    state.isMaxInclusive = false;
    const newExclMax = restrictions[IntRestrictionKey.maximum];
    state.max = newExclMax;
    restrictions[IntRestrictionKey.exclusiveMaximum] = newExclMax;
    restrictions[IntRestrictionKey.maximum] = undefined;
  }
  state.numberRestrictionsError = validateMinMax(state);
};

const setMin = (state: NumberRestrictionsReducerState, action: SetMinMaxAction) => {
  const { value } = action;
  const key = state.isMinInclusive ? IntRestrictionKey.minimum : IntRestrictionKey.exclusiveMinimum;
  state.min = value;
  state.restrictions[key] = value;
  state.numberRestrictionsError = validateMinMax(state);
};

const setMax = (state: NumberRestrictionsReducerState, action: SetMinMaxAction) => {
  const { value } = action;
  const key = state.isMaxInclusive ? IntRestrictionKey.maximum : IntRestrictionKey.exclusiveMaximum;
  state.max = value;
  state.restrictions[key] = value;
  state.numberRestrictionsError = validateMinMax(state);
};

const setMultipleOf = (state: NumberRestrictionsReducerState, action: SetMultipleOf) => {
  state.restrictions[IntRestrictionKey.multipleOf] = action.value;
};

const setRestriction = (state: NumberRestrictionsReducerState, action: SetRestrictionAction) =>
  (state.restrictions[action.restriction] = action.value);

export const numberRestrictionsReducer = (
  state: NumberRestrictionsReducerState,
  action: NumberRestrictionsReducerAction,
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
    case NumberRestrictionsReducerActionType.setMultipleOf:
      setMultipleOf(state, action);
      break;
    case NumberRestrictionsReducerActionType.setRestriction:
      setRestriction(state, action);
  }
  action.changeCallback(state.restrictions);
  return state;
};
