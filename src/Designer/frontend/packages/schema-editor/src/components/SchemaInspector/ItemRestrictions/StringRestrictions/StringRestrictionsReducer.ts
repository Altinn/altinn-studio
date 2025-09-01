import { StrRestrictionKey } from '@altinn/schema-model';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';

type ChangeCallback = (restrictions: KeyValuePairs) => void;

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
  restriction: StrRestrictionKey;
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
    [restriction in StrRestrictionKey]?: string;
  };
};

const setMinIncl = (state: StringRestricionsReducerState, action: SetInclAction) => {
  const { restrictions } = state;
  if (action.value) {
    state.earliestIsInclusive = true;
    const newInclMin = restrictions[StrRestrictionKey.formatExclusiveMinimum];
    state.earliest = newInclMin;
    restrictions[StrRestrictionKey.formatMinimum] = newInclMin;
    restrictions[StrRestrictionKey.formatExclusiveMinimum] = undefined;
  } else {
    state.earliestIsInclusive = false;
    const newExclMin = restrictions[StrRestrictionKey.formatMinimum];
    state.earliest = newExclMin;
    restrictions[StrRestrictionKey.formatExclusiveMinimum] = newExclMin;
    restrictions[StrRestrictionKey.formatMinimum] = undefined;
  }
};

const setMaxIncl = (state: StringRestricionsReducerState, action: SetInclAction) => {
  const { restrictions } = state;
  if (action.value) {
    state.latestIsInclusive = true;
    const newInclMax = restrictions[StrRestrictionKey.formatExclusiveMaximum];
    state.latest = newInclMax;
    restrictions[StrRestrictionKey.formatMaximum] = newInclMax;
    restrictions[StrRestrictionKey.formatExclusiveMaximum] = undefined;
  } else {
    state.latestIsInclusive = false;
    const newExclMax = restrictions[StrRestrictionKey.formatMaximum];
    state.latest = newExclMax;
    restrictions[StrRestrictionKey.formatExclusiveMaximum] = newExclMax;
    restrictions[StrRestrictionKey.formatMaximum] = undefined;
  }
};

const setEarliest = (state: StringRestricionsReducerState, action: SetEarliestOrLatestAction) => {
  const { value } = action;
  const key = state.earliestIsInclusive
    ? StrRestrictionKey.formatMinimum
    : StrRestrictionKey.formatExclusiveMinimum;
  state.earliest = value;
  state.restrictions[key] = value;
};

const setLatest = (state: StringRestricionsReducerState, action: SetEarliestOrLatestAction) => {
  const { value } = action;
  const key = state.latestIsInclusive
    ? StrRestrictionKey.formatMaximum
    : StrRestrictionKey.formatExclusiveMaximum;
  state.latest = value;
  state.restrictions[key] = value;
};

const setRestriction = (state: StringRestricionsReducerState, action: SetRestrictionAction) =>
  (state.restrictions[action.restriction] = action.value);

export const stringRestrictionsReducer = (
  state: StringRestricionsReducerState,
  action: StringRestrictionsReducerAction,
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
