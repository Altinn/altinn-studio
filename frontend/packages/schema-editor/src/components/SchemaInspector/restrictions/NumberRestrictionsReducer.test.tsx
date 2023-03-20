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
  isInteger: false,
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
    describe('At least one value is undefined', () => {
      describe.each([true, false])('isInteger = %s', (isInteger) => {
        describe.each([true, false])('isMinInclusive = %s', (isMinInclusive) => {
          describe.each([true, false])('isMaxInclusive = %s', (isMaxInclusive) => {
            it.each([
              [undefined, undefined],
              [undefined, 5],
              [5, undefined],
            ])('Returns NoError when min = %s and max = %s', (min, max) => {
              const result = validateMinMax({
                ...defaultState,
                isInteger,
                isMinInclusive,
                isMaxInclusive,
                min,
                max,
              });
              expect(result).toBe(NameError.NoError);
            });
          });
        });
      });
    });
    describe('Is integer', () => {
      describe('Both min and max are exclusive', () => {
        const bothExclState: NumberRestrictionsReducerState = {
          ...defaultState,
          isInteger: true,
          isMinInclusive: false,
          isMaxInclusive: false,
        };
        it('Returns InvalidMaxMinValue if min > max', () => {
          const result = validateMinMax({ ...bothExclState, min: 7, max: 5 });
          expect(result).toBe(NameError.InvalidMaxMinValue);
        });
        it('Returns InvalidMaxMinValue if min === max', () => {
          const result = validateMinMax({ ...bothExclState, min: 5, max: 5 });
          expect(result).toBe(NameError.InvalidMaxMinValue);
        });
        it('Returns InvalidMaxMinValue if min === max - 1', () => {
          const result = validateMinMax({ ...bothExclState, min: 5, max: 6 });
          expect(result).toBe(NameError.NoError);
        });
        it('Returns NoError if min < max - 1', () => {
          const result = validateMinMax({ ...bothExclState, min: 5, max: 7 });
          expect(result).toBe(NameError.NoError);
        });
      });
      describe.each([
        [true, false],
        [false, true],
      ])('isMinInclusive=%s and isMaxInclusive=%s', (isMinInclusive, isMaxInclusive) => {
        const oneInclState: NumberRestrictionsReducerState = {
          ...defaultState,
          isInteger: true,
          isMinInclusive,
          isMaxInclusive,
        };
        it('Returns InvalidMaxMinValue if min > max', () => {
          const result = validateMinMax({ ...oneInclState, min: 7, max: 5 });
          expect(result).toBe(NameError.InvalidMaxMinValue);
        });
        it('Returns InvalidMaxMinValue if min === max', () => {
          const result = validateMinMax({ ...oneInclState, min: 5, max: 5 });
          expect(result).toBe(NameError.InvalidMaxMinValue);
        });
        it('Returns NoError if min === max - 1', () => {
          const result = validateMinMax({ ...oneInclState, min: 5, max: 6 });
          expect(result).toBe(NameError.NoError);
        });
        it('Returns NoError if min < max - 1', () => {
          const result = validateMinMax({ ...oneInclState, min: 5, max: 7 });
          expect(result).toBe(NameError.NoError);
        });
      });
      describe('Both min and max are inclusive', () => {
        const bothInclState: NumberRestrictionsReducerState = {
          ...defaultState,
          isInteger: true,
          isMinInclusive: true,
          isMaxInclusive: true,
        };
        it('Returns InvalidMaxMinValue if min > max', () => {
          const result = validateMinMax({ ...bothInclState, min: 7, max: 5 });
          expect(result).toBe(NameError.InvalidMaxMinValue);
        });
        it('Returns NoError if min === max', () => {
          const result = validateMinMax({ ...bothInclState, min: 5, max: 5 });
          expect(result).toBe(NameError.NoError);
        });
        it('Returns NoError if min === max - 1', () => {
          const result = validateMinMax({ ...bothInclState, min: 5, max: 6 });
          expect(result).toBe(NameError.NoError);
        });
        it('Returns NoError if min < max - 1', () => {
          const result = validateMinMax({ ...bothInclState, min: 5, max: 7 });
          expect(result).toBe(NameError.NoError);
        });
      });
    });
    describe('Is not integer', () => {
      describe.each([
        [false, false],
        [false, true],
        [true, false],
      ])('isMinInclusive=%s and isMaxInclusive=%s', (isMinInclusive, isMaxInclusive) => {
        const atLeastOneExclusiveState: NumberRestrictionsReducerState = {
          ...defaultState,
          isInteger: false,
          isMinInclusive,
          isMaxInclusive,
          max: undefined,
        };
        it('Returns InvalidMaxMinValue if min > max', () => {
          const result = validateMinMax({ ...atLeastOneExclusiveState, min: 5.2, max: 5.1 });
          expect(result).toBe(NameError.InvalidMaxMinValue);
        });
        it('Returns InvalidMaxMinValue if min === max', () => {
          const result = validateMinMax({ ...atLeastOneExclusiveState, min: 5.1, max: 5.1 });
          expect(result).toBe(NameError.InvalidMaxMinValue);
        });
        it('Returns NoError if min < max', () => {
          const result1 = validateMinMax({ ...atLeastOneExclusiveState, min: 5.1, max: 7.1 });
          expect(result1).toBe(NameError.NoError);
          const result2 = validateMinMax({ ...atLeastOneExclusiveState, min: 5.1, max: 6.1 });
          expect(result2).toBe(NameError.NoError);
          const result3 = validateMinMax({ ...atLeastOneExclusiveState, min: 5.1, max: 5.2 });
          expect(result3).toBe(NameError.NoError);
        });
      });
      describe('Both min and max are inclusive', () => {
        const bothInclState: NumberRestrictionsReducerState = {
          ...defaultState,
          isInteger: false,
          isMinInclusive: true,
          isMaxInclusive: true,
        };
        it('Returns InvalidMaxMinValue if min > max', () => {
          const result = validateMinMax({ ...bothInclState, min: 5.2, max: 5.1 });
          expect(result).toBe(NameError.InvalidMaxMinValue);
        });
        it('Returns NoError if min === max', () => {
          const result = validateMinMax({ ...bothInclState, min: 5.1, max: 5.1 });
          expect(result).toBe(NameError.NoError);
        });
        it('Returns NoError if min < max', () => {
          const result1 = validateMinMax({ ...bothInclState, min: 5.1, max: 7.1 });
          expect(result1).toBe(NameError.NoError);
          const result2 = validateMinMax({ ...bothInclState, min: 5.1, max: 6.1 });
          expect(result2).toBe(NameError.NoError);
          const result3 = validateMinMax({ ...bothInclState, min: 5.1, max: 5.2 });
          expect(result3).toBe(NameError.NoError);
        });
      });
    });
  });
});
