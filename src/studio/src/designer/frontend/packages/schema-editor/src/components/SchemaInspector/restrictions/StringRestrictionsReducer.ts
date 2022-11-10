import { StrRestrictionKeys } from '@altinn/schema-model';
import { Dict } from '@altinn/schema-model/src/lib/types';

type ChangeCallback = (restrictions: Dict) => void;

interface SetInclAction {
  type: 'setMinIncl' | 'setMaxIncl';
  value: boolean;
  changeCallback: ChangeCallback;
}

interface SetEarliestOrLatestAction {
  type: 'setEarliest' | 'setLatest';
  value: string;
  changeCallback: ChangeCallback;
}

interface SetRestrictionAction {
  type: 'setRestriction';
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
  }
};

export const stringRestrictionsReducer = (
  state: StringRestricionsReducerState,
  action: StringRestrictionsReducerAction
) => {
  const { restrictions } = state;
  switch (action.type) {
    case 'setMinIncl': {
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
      break;
    }
    case 'setMaxIncl': {
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
      break;
    }
    case 'setEarliest': {
      const { value } = action;
      const key = state.earliestIsInclusive
        ? StrRestrictionKeys.formatMinimum
        : StrRestrictionKeys.formatExclusiveMinimum;
      state.earliest = value;
      restrictions[key] = value;
      break;
    }
    case 'setLatest': {
      const { value } = action;
      const key = state.latestIsInclusive
        ? StrRestrictionKeys.formatMaximum
        : StrRestrictionKeys.formatExclusiveMaximum;
      state.latest = value;
      restrictions[key] = value;
      break;
    }
    case 'setRestriction': {
      restrictions[action.restriction] = action.value;
    }
  }
  action.changeCallback(state.restrictions);
  return state;
};
