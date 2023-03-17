import { NameError } from '@altinn/schema-editor/types';
import { validateMinMax } from './NumberRestrictionsReducer';
import type {
  NumberRestrictionsReducerState,
  NumberRestrictionsReducerAction,
} from './NumberRestrictionsReducer';
import {
  numberRestrictionsReducer,
  NumberRestrictionsReducerActionType,
} from './NumberRestrictionsReducer';
import { IntRestrictionKeys } from '@altinn/schema-model';

const maxNumber = 5;
const minNumber = 3;
const defaultRestrictions: { [restriction in IntRestrictionKeys]?: number } = {
  maximum: maxNumber,
  minimum: minNumber,
  exclusiveMaximum: undefined,
  exclusiveMinimum: undefined,
  multipleOf: 1,
};
const defaultState: NumberRestrictionsReducerState = {
  isMinInclusive: true,
  isMaxInclusive: true,
  min: minNumber,
  max: maxNumber,
  restrictions: defaultRestrictions,
  nameError: NameError.NoError,
};

const changeCallback = jest.fn();
const dispatchAction = (
  action: NumberRestrictionsReducerAction,
  state?: Partial<NumberRestrictionsReducerState>
) => numberRestrictionsReducer(state ? { ...defaultState, ...state } : defaultState, action);

describe('NumberRestrictionsReducer', () => {
  afterEach(() => jest.clearAllMocks());
  describe('setRestriction', () => {
    it('Updates state correctly', () => {
      const value = 2;
      const state = dispatchAction({
        type: NumberRestrictionsReducerActionType.setRestriction,
        restriction: IntRestrictionKeys.multipleOf,
        changeCallback,
        value,
      });
      expect(state.restrictions.multipleOf).toEqual(value);
      expect(changeCallback).toHaveBeenCalledTimes(1);
      expect(changeCallback).toHaveBeenCalledWith(expect.objectContaining({ multipleOf: value }));
    });
  });

  describe('setMinIncl', () => {
    const type = NumberRestrictionsReducerActionType.setMinIncl;
    it('Updates state correctly on change from inclusive to exclusive', () => {
      const state = dispatchAction({
        type,
        value: false,
        changeCallback,
      });
      expect(state.isMinInclusive).toBe(false);
      expect(state.min).toBe(minNumber);
      expect(state.restrictions.minimum).toBeUndefined();
      expect(state.restrictions.exclusiveMinimum).toBe(minNumber);
      expect(state.restrictions.maximum).toBe(maxNumber);
      expect(state.restrictions.exclusiveMaximum).toBeUndefined();
      expect(changeCallback).toHaveBeenCalledTimes(1);
      expect(changeCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          minimum: undefined,
          exclusiveMinimum: minNumber,
          maximum: defaultRestrictions.maximum,
          exclusiveMaximum: defaultRestrictions.exclusiveMaximum,
        })
      );
    });

    it('Updates state correctly on change from exclusive to inclusive', () => {
      const initialRestrictions: { [restriction in IntRestrictionKeys]?: number } = {
        ...defaultRestrictions,
        minimum: undefined,
        exclusiveMinimum: minNumber,
      };
      const state = dispatchAction(
        { type, value: true, changeCallback },
        { isMinInclusive: false, restrictions: initialRestrictions }
      );
      expect(state.isMinInclusive).toBe(true);
      expect(state.min).toBe(minNumber);
      expect(state.restrictions.minimum).toBe(minNumber);
      expect(state.restrictions.exclusiveMinimum).toBeUndefined();
      expect(state.restrictions.maximum).toBe(maxNumber);
      expect(state.restrictions.exclusiveMaximum).toBeUndefined();
      expect(changeCallback).toHaveBeenCalledTimes(1);
      expect(changeCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          minimum: minNumber,
          exclusiveMinimum: undefined,
          maximum: defaultRestrictions.maximum,
          exclusiveMaximum: defaultRestrictions.exclusiveMaximum,
        })
      );
    });
  });

  describe('setMaxIncl', () => {
    const type = NumberRestrictionsReducerActionType.setMaxIncl;
    it('Updates state correctly on change from inclusive to exclusive', () => {
      const state = dispatchAction({ type, value: false, changeCallback });
      expect(state.isMaxInclusive).toBe(false);
      expect(state.max).toBe(maxNumber);
      expect(state.restrictions.maximum).toBeUndefined();
      expect(state.restrictions.exclusiveMaximum).toBe(maxNumber);
      expect(state.restrictions.exclusiveMinimum).toBe(minNumber);
      expect(changeCallback).toHaveBeenCalledTimes(1);
      expect(changeCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          minimum: defaultRestrictions.minimum,
          exclusiveMinimum: defaultRestrictions.exclusiveMinimum,
          maximum: undefined,
          exclusiveMaximum: maxNumber,
        })
      );
    });

    it('Updates state correctly on change from exclusive to inclusive', () => {
      const initialRestrictions: { [restriction in IntRestrictionKeys]?: number } = {
        ...defaultRestrictions,
        maximum: undefined,
        exclusiveMaximum: maxNumber,
      };
      const state = dispatchAction(
        { type, value: true, changeCallback },
        { isMaxInclusive: false, restrictions: initialRestrictions }
      );
      expect(state.isMaxInclusive).toBe(true);
      expect(state.max).toBe(maxNumber);
      expect(state.restrictions.maximum).toBe(maxNumber);
      expect(state.restrictions.exclusiveMaximum).toBeUndefined();
      expect(state.restrictions.exclusiveMinimum).toBe(minNumber);
      expect(changeCallback).toHaveBeenCalledTimes(1);
      expect(changeCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          minimum: defaultRestrictions.minimum,
          exclusiveMinimum: defaultRestrictions.exclusiveMinimum,
          maximum: maxNumber,
          exclusiveMaximum: undefined,
        })
      );
    });
  });

  describe('setMin', () => {
    const type = NumberRestrictionsReducerActionType.setMinExcl;
    it('Updates state correctly when inclusive', () => {
      const value = 2;
      const state = dispatchAction({ type, value, changeCallback }, { isMinInclusive: true });
      expect(state.min).toEqual(value);
      expect(state.restrictions.minimum).toEqual(value);
      expect(state.restrictions.minimum).toEqual(value);
      expect(changeCallback).toHaveBeenCalledTimes(1);
      expect(changeCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          minimum: value,
          exclusiveMinimum: defaultRestrictions.exclusiveMinimum,
        })
      );
    });
  });

  describe('setMax', () => {
    const type = NumberRestrictionsReducerActionType.setMaxExcl;

    it('Updates state correctly when inclusive', () => {
      const value = 5;
      const state = dispatchAction({ type, value, changeCallback }, { isMaxInclusive: true });
      expect(state.max).toEqual(value);
      expect(state.restrictions.maximum).toEqual(value);
      expect(state.restrictions.exclusiveMaximum).toEqual(value);
      expect(changeCallback).toHaveBeenCalledTimes(1);
      expect(changeCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          maximum: value,
          exclusiveMaximum: defaultRestrictions.exclusiveMaximum,
        })
      );
    });
  });

  describe('validateMinMax', () => {
    test('Should return no error if min is less than max', () => {
      const formatState: NumberRestrictionsReducerState = { ...defaultState, min: 4, max: 7 };
      expect(validateMinMax(formatState)).toBe(NameError.NoError);
    });

    it('Should return error if min is equal to the max', () => {
      const formatState: NumberRestrictionsReducerState = { ...defaultState, min: 7, max: 7 };
      expect(validateMinMax(formatState)).toBe(NameError.InvalidMaxMinValue);
    });

    it('Should return error message if min is greater than max', () => {
      const formatState: NumberRestrictionsReducerState = { ...defaultState, min: 7, max: 4 };
      expect(validateMinMax(formatState)).toBe(NameError.InvalidMaxMinValue);
    });

    it('Should return error message if min is equal to max and both are inclusive', () => {
      const formatState: NumberRestrictionsReducerState = {
        ...defaultState,
        min: 7,
        max: 7,
        isMinInclusive: true,
        isMaxInclusive: true,
      };
      expect(validateMinMax(formatState)).toBe(NameError.InvalidMaxMinValue);
    });

    it('Should return error message if min is equal to max and both are exclusive', () => {
      const formatState: NumberRestrictionsReducerState = {
        ...defaultState,
        min: 7,
        max: 7,
        isMinInclusive: false,
        isMaxInclusive: false,
      };
      expect(validateMinMax(formatState)).toBe(NameError.InvalidMaxMinValue);
    });

    it('Should return error message if min is equal to max and min is inclusive and max is exclusive', () => {
      const formatState: NumberRestrictionsReducerState = {
        ...defaultState,
        min: 7,
        max: 7,
        isMinInclusive: true,
        isMaxInclusive: false,
      };
      expect(validateMinMax(formatState)).toBe(NameError.InvalidMaxMinValue);
    });

    it('Should return error message if min is equal to max and min is exclusive and max is inclusive', () => {
      const formatState: NumberRestrictionsReducerState = {
        ...defaultState,
        min: 7,
        max: 7,
        isMinInclusive: false,
        isMaxInclusive: true,
      };
      expect(validateMinMax(formatState)).toBe(NameError.InvalidMaxMinValue);
    });
  });
});
