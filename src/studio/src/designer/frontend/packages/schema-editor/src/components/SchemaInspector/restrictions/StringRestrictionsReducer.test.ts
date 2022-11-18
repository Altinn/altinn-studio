import { StringFormat, StrRestrictionKeys } from '@altinn/schema-model';
import type { StringRestricionsReducerState, StringRestrictionsReducerAction } from './StringRestrictionsReducer';
import { stringRestrictionsReducer, StringRestrictionsReducerActionType } from './StringRestrictionsReducer';

// Test data
const maxDate = '3000-01-01';
const minDate = '1000-01-01';
const defaultRestrictions = {
  format: StringFormat.Date,
  formatMaximum: maxDate,
  formatMinimum: minDate,
  formatExclusiveMaximum: undefined,
  formatExclusiveMinimum: undefined,
  pattern: ''
};
const defaultState: StringRestricionsReducerState = {
  earliestIsInclusive: true,
  latestIsInclusive: true,
  earliest: minDate,
  latest: maxDate,
  restrictions: defaultRestrictions
};

const changeCallback = jest.fn();

const dispatchAction = (action: StringRestrictionsReducerAction, state?: Partial<StringRestricionsReducerState>) =>
  stringRestrictionsReducer({...defaultState, restrictions: {...defaultRestrictions}, ...state}, action);


describe('stringRestrictionsReducer', () => {

  afterEach(() => jest.clearAllMocks());

  describe('setRestriction', () => {
    it('Updates state correctly', () => {
      const state = dispatchAction({
        type: StringRestrictionsReducerActionType.setRestriction,
        restriction: StrRestrictionKeys.format,
        value: StringFormat.DateTime,
        changeCallback
      });
      expect(state.restrictions.format).toEqual(StringFormat.DateTime);
      expect(changeCallback).toHaveBeenCalledTimes(1);
      expect(changeCallback).toHaveBeenCalledWith(expect.objectContaining({format: StringFormat.DateTime}));
    });
  });

  describe('setMinIncl', () => {
    const type = StringRestrictionsReducerActionType.setMinIncl;

    it('Updates state correctly on change from inclusive to exclusive', () => {
      const state = dispatchAction({
        type,
        value: false,
        changeCallback
      });
      expect(state.earliestIsInclusive).toBe(false);
      expect(state.earliest).toBe(minDate);
      expect(state.restrictions.formatMinimum).toBeUndefined();
      expect(state.restrictions.formatExclusiveMinimum).toBe(minDate);
      expect(state.restrictions.formatMaximum).toBe(maxDate);
      expect(state.restrictions.formatExclusiveMaximum).toBeUndefined();
      expect(changeCallback).toHaveBeenCalledTimes(1);
      expect(changeCallback).toHaveBeenCalledWith(expect.objectContaining({
        formatMinimum: undefined,
        formatExclusiveMinimum: minDate,
        formatMaximum: maxDate,
        formatExclusiveMaximum: undefined
      }));
    });

    it('Updates state correctly on change from exclusive to inclusive', () => {
      const initialRestrictions = {
        ...defaultRestrictions,
        formatMinimum: undefined,
        formatExclusiveMinimum: minDate
      };
      const state = dispatchAction({
        type,
        value: true,
        changeCallback
      }, { earliestIsInclusive: false, restrictions: initialRestrictions });
      expect(state.earliestIsInclusive).toBe(true);
      expect(state.earliest).toBe(minDate);
      expect(state.restrictions.formatMinimum).toBe(minDate);
      expect(state.restrictions.formatExclusiveMinimum).toBeUndefined();
      expect(state.restrictions.formatMaximum).toBe(maxDate);
      expect(state.restrictions.formatExclusiveMaximum).toBeUndefined();
      expect(changeCallback).toHaveBeenCalledTimes(1);
      expect(changeCallback).toHaveBeenCalledWith(expect.objectContaining({
        formatMinimum: minDate,
        formatExclusiveMinimum: undefined,
        formatMaximum: maxDate,
        formatExclusiveMaximum: undefined
      }));
    });
  });

  describe('setMaxIncl', () => {
    const type = StringRestrictionsReducerActionType.setMaxIncl;

    it('Updates state correctly on change from inclusive to exclusive', () => {
      const state = dispatchAction({ type, value: false, changeCallback });
      expect(state.latestIsInclusive).toBe(false);
      expect(state.latest).toBe(maxDate);
      expect(state.restrictions.formatMinimum).toBe(minDate);
      expect(state.restrictions.formatExclusiveMinimum).toBeUndefined();
      expect(state.restrictions.formatMaximum).toBeUndefined();
      expect(state.restrictions.formatExclusiveMaximum).toBe(maxDate);
      expect(changeCallback).toHaveBeenCalledTimes(1);
      expect(changeCallback).toHaveBeenCalledWith(expect.objectContaining({
        formatMinimum: minDate,
        formatExclusiveMinimum: undefined,
        formatMaximum: undefined,
        formatExclusiveMaximum: maxDate
      }));
    });

    it('Updates state correctly on change from exclusive to inclusive', () => {
      const initialRestrictions = {
        ...defaultRestrictions,
        formatMaximum: undefined,
        formatExclusiveMaximum: maxDate
      };
      const state = dispatchAction(
        { type, value: true, changeCallback },
        { latestIsInclusive: false, restrictions: initialRestrictions }
      );
      expect(state.latestIsInclusive).toBe(true);
      expect(state.latest).toBe(maxDate);
      expect(state.restrictions.formatMinimum).toBe(minDate);
      expect(state.restrictions.formatExclusiveMinimum).toBeUndefined();
      expect(state.restrictions.formatMaximum).toBe(maxDate);
      expect(state.restrictions.formatExclusiveMaximum).toBeUndefined();
      expect(changeCallback).toHaveBeenCalledTimes(1);
      expect(changeCallback).toHaveBeenCalledWith(expect.objectContaining({
        formatMinimum: minDate,
        formatExclusiveMinimum: undefined,
        formatMaximum: maxDate,
        formatExclusiveMaximum: undefined
      }));
    });
  });

  describe('setEarliest', () => {
    const type = StringRestrictionsReducerActionType.setEarliest;

    it('Updates state correctly when inclusive', () => {
      const value = '2020-02-02';
      const state = dispatchAction({ type, value, changeCallback });
      expect(state.earliestIsInclusive).toBe(true);
      expect(state.earliest).toBe(value);
      expect(state.restrictions.formatMinimum).toBe(value);
      expect(state.restrictions.formatExclusiveMinimum).toBeUndefined();
      expect(state.restrictions.formatMaximum).toBe(maxDate);
      expect(state.restrictions.formatExclusiveMaximum).toBeUndefined();
      expect(changeCallback).toHaveBeenCalledTimes(1);
      expect(changeCallback).toHaveBeenCalledWith(expect.objectContaining({
        formatMinimum: value,
        formatExclusiveMinimum: undefined,
        formatMaximum: maxDate,
        formatExclusiveMaximum: undefined
      }));
    });

    it('Updates state correctly when exclusive', () => {
      const initialRestrictions = {
        ...defaultRestrictions,
        formatMinimum: undefined,
        formatExclusiveMinimum: minDate
      };
      const value = '2020-02-02';
      const state = dispatchAction(
        { type, value, changeCallback },
        { earliestIsInclusive: false, restrictions: initialRestrictions }
      );
      expect(state.earliestIsInclusive).toBe(false);
      expect(state.earliest).toBe(value);
      expect(state.restrictions.formatMinimum).toBeUndefined();
      expect(state.restrictions.formatExclusiveMinimum).toBe(value);
      expect(state.restrictions.formatMaximum).toBe(maxDate);
      expect(state.restrictions.formatExclusiveMaximum).toBeUndefined();
      expect(changeCallback).toHaveBeenCalledTimes(1);
      expect(changeCallback).toHaveBeenCalledWith(expect.objectContaining({
        formatMinimum: undefined,
        formatExclusiveMinimum: value,
        formatMaximum: maxDate,
        formatExclusiveMaximum: undefined
      }));
    });
  });

  describe('setLatest', () => {
    const type = StringRestrictionsReducerActionType.setLatest;

    it('Updates state correctly when inclusive', () => {
      const value = '2020-02-02';
      const state = dispatchAction({ type, value, changeCallback });
      expect(state.latestIsInclusive).toBe(true);
      expect(state.latest).toBe(value);
      expect(state.restrictions.formatMinimum).toBe(minDate);
      expect(state.restrictions.formatExclusiveMinimum).toBeUndefined();
      expect(state.restrictions.formatMaximum).toBe(value);
      expect(state.restrictions.formatExclusiveMaximum).toBeUndefined();
      expect(changeCallback).toHaveBeenCalledTimes(1);
      expect(changeCallback).toHaveBeenCalledWith(expect.objectContaining({
        formatMinimum: minDate,
        formatExclusiveMinimum: undefined,
        formatMaximum: value,
        formatExclusiveMaximum: undefined
      }));
    });

    it('Updates state correctly when exclusive', () => {
      const initialRestrictions = {
        ...defaultRestrictions,
        formatMaximum: undefined,
        formatExclusiveMaximum: maxDate
      };
      const value = '2020-02-02';
      const state = dispatchAction(
        { type, value, changeCallback },
        { latestIsInclusive: false, restrictions: initialRestrictions }
      );
      expect(state.latestIsInclusive).toBe(false);
      expect(state.latest).toBe(value);
      expect(state.restrictions.formatMinimum).toBe(minDate);
      expect(state.restrictions.formatExclusiveMinimum).toBeUndefined();
      expect(state.restrictions.formatMaximum).toBeUndefined();
      expect(state.restrictions.formatExclusiveMaximum).toBe(value);
      expect(changeCallback).toHaveBeenCalledTimes(1);
      expect(changeCallback).toHaveBeenCalledWith(expect.objectContaining({
        formatMinimum: minDate,
        formatExclusiveMinimum: undefined,
        formatMaximum: undefined,
        formatExclusiveMaximum: value
      }));
    });
  });
})
