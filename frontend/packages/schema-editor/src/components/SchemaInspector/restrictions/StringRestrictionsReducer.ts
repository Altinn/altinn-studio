import { StrRestrictionKeys } from '@altinn/schema-model';
import type { Dict } from '@altinn/schema-model/src/lib/types';

type ChangeCallback = (restrictions: Dict) => void;

export enum StringRestrictionsReducerActionType {
  setEarliest = 'setEarliest',
  setLatest = 'setLatest',
  setMaxIncl = 'setMaxIncl',
  setMinIncl = 'setMinIncl',
  setRestriction = 'setRestriction',
}

interface SetInclAction {
  type:
    | StringRestrictionsReducerActionType.setMinIncl
    | StringRestrictionsReducerActionType.setMaxIncl;
  value: boolean;
  changeCallback: ChangeCallback;
}

interface SetEarliestOrLatestAction {
  type:
    | StringRestrictionsReducerActionType.setEarliest
    | StringRestrictionsReducerActionType.setLatest;
  value: string;
  changeCallback: ChangeCallback;
}

interface SetRestrictionAction {
  type: StringRestrictionsReducerActionType.setRestriction;
  restriction: StrRestrictionKeys;
  value: string;
  changeCallback: ChangeCallback;
}

export type StringRestrictionsReducerAction =
  | SetInclAction
  | SetEarliestOrLatestAction
  | SetRestrictionAction;

export type StringRestricionsReducerState = {
  earliestIsInclusive: boolean;
  latestIsInclusive: boolean;
  earliest: string;
  latest: string;
  restrictions: {
    [restriction in StrRestrictionKeys]?: string;
  };
};

const setMinIncl = (state: StringRestricionsReducerState, action: SetInclAction) => {
  const { restrictions } = state;
  if (action.value) {
    state.earliestIsInclusive = true;
    const newInclMin = restrictions[StrRestrictionKeys.formatExclusiveMinimum];
    state.earliest = newInclMin;
    restrictions[StrRestrictionKeys.formatMinimum] = newInclMin;
    restrictions[StrRestrictionKeys.formatExclusiveMinimum] = undefined;
  } else {
    state.earliestIsInclusive = false;
    const newExclMin = restrictions[StrRestrictionKeys.formatMinimum];
    state.earliest = newExclMin;
    restrictions[StrRestrictionKeys.formatExclusiveMinimum] = newExclMin;
    restrictions[StrRestrictionKeys.formatMinimum] = undefined;
  }
};

const setMaxIncl = (state: StringRestricionsReducerState, action: SetInclAction) => {
  const { restrictions } = state;
  if (action.value) {
    state.latestIsInclusive = true;
    const newInclMax = restrictions[StrRestrictionKeys.formatExclusiveMaximum];
    state.latest = newInclMax;
    restrictions[StrRestrictionKeys.formatMaximum] = newInclMax;
    restrictions[StrRestrictionKeys.formatExclusiveMaximum] = undefined;
  } else {
    state.latestIsInclusive = false;
    const newExclMax = restrictions[StrRestrictionKeys.formatMaximum];
    state.latest = newExclMax;
    restrictions[StrRestrictionKeys.formatExclusiveMaximum] = newExclMax;
    restrictions[StrRestrictionKeys.formatMaximum] = undefined;
  }
};

const setEarliest = (state: StringRestricionsReducerState, action: SetEarliestOrLatestAction) => {
  const { value } = action;
  const key = state.earliestIsInclusive
    ? StrRestrictionKeys.formatMinimum
    : StrRestrictionKeys.formatExclusiveMinimum;
  state.earliest = value;
  state.restrictions[key] = value;
};

const setLatest = (state: StringRestricionsReducerState, action: SetEarliestOrLatestAction) => {
  const { value } = action;
  const key = state.latestIsInclusive
    ? StrRestrictionKeys.formatMaximum
    : StrRestrictionKeys.formatExclusiveMaximum;
  state.latest = value;
  state.restrictions[key] = value;
};

const setRestriction = (state: StringRestricionsReducerState, action: SetRestrictionAction) =>
  (state.restrictions[action.restriction] = action.value);

export const stringRestrictionsReducer = (
  state: StringRestricionsReducerState,
  action: StringRestrictionsReducerAction
) => {
  switch (action.type) {
    case StringRestrictionsReducerActionType.setMinIncl:
      setMinIncl(state, action);
      break;
    case StringRestrictionsReducerActionType.setMaxIncl:
      setMaxIncl(state, action);
      break;
    case StringRestrictionsReducerActionType.setEarliest:
      setEarliest(state, action);
      break;
    case StringRestrictionsReducerActionType.setLatest:
      setLatest(state, action);
      break;
    case StringRestrictionsReducerActionType.setRestriction:
      setRestriction(state, action);
  }
  action.changeCallback(state.restrictions);
  return state;
};
