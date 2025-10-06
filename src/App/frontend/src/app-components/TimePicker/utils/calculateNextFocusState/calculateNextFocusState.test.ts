import { DropdownFocusState, NavigationAction } from 'src/app-components/TimePicker/types';
import { calculateNextFocusState } from 'src/app-components/TimePicker/utils/calculateNextFocusState/calculateNextFocusState';

describe('calculateNextFocusState', () => {
  const maxColumns = 3; // hours, minutes, seconds
  const optionCounts = [24, 60, 60]; // 24 hours, 60 minutes, 60 seconds

  describe('inactive state', () => {
    it('should return unchanged state when not active', () => {
      const inactiveState: DropdownFocusState = {
        column: 0,
        option: 5,
        isActive: false,
      };

      const action: NavigationAction = { type: 'ARROW_DOWN' };
      const result = calculateNextFocusState(inactiveState, action, maxColumns, optionCounts);

      expect(result).toEqual(inactiveState);
    });
  });

  describe('ARROW_DOWN navigation', () => {
    it('should increment option index', () => {
      const state: DropdownFocusState = { column: 0, option: 5, isActive: true };
      const action: NavigationAction = { type: 'ARROW_DOWN' };

      const result = calculateNextFocusState(state, action, maxColumns, optionCounts);

      expect(result).toEqual({
        column: 0,
        option: 6,
        isActive: true,
      });
    });

    it('should wrap to 0 when at last option', () => {
      const state: DropdownFocusState = { column: 0, option: 23, isActive: true }; // Last hour
      const action: NavigationAction = { type: 'ARROW_DOWN' };

      const result = calculateNextFocusState(state, action, maxColumns, optionCounts);

      expect(result).toEqual({
        column: 0,
        option: 0,
        isActive: true,
      });
    });

    it('should handle different column option counts', () => {
      // Minutes column (60 options)
      const state: DropdownFocusState = { column: 1, option: 59, isActive: true };
      const action: NavigationAction = { type: 'ARROW_DOWN' };

      const result = calculateNextFocusState(state, action, maxColumns, optionCounts);

      expect(result).toEqual({
        column: 1,
        option: 0,
        isActive: true,
      });
    });
  });

  describe('ARROW_UP navigation', () => {
    it('should decrement option index', () => {
      const state: DropdownFocusState = { column: 0, option: 5, isActive: true };
      const action: NavigationAction = { type: 'ARROW_UP' };

      const result = calculateNextFocusState(state, action, maxColumns, optionCounts);

      expect(result).toEqual({
        column: 0,
        option: 4,
        isActive: true,
      });
    });

    it('should wrap to last option when at 0', () => {
      const state: DropdownFocusState = { column: 0, option: 0, isActive: true };
      const action: NavigationAction = { type: 'ARROW_UP' };

      const result = calculateNextFocusState(state, action, maxColumns, optionCounts);

      expect(result).toEqual({
        column: 0,
        option: 23, // Last hour (24-1)
        isActive: true,
      });
    });
  });

  describe('ARROW_RIGHT navigation', () => {
    it('should move to next column', () => {
      const state: DropdownFocusState = { column: 0, option: 5, isActive: true };
      const action: NavigationAction = { type: 'ARROW_RIGHT' };

      const result = calculateNextFocusState(state, action, maxColumns, optionCounts);

      expect(result).toEqual({
        column: 1,
        option: 5, // Same option index if valid
        isActive: true,
      });
    });

    it('should wrap to first column when at last column', () => {
      const state: DropdownFocusState = { column: 2, option: 10, isActive: true }; // Seconds column
      const action: NavigationAction = { type: 'ARROW_RIGHT' };

      const result = calculateNextFocusState(state, action, maxColumns, optionCounts);

      expect(result).toEqual({
        column: 0, // Wrap to hours
        option: 10,
        isActive: true,
      });
    });

    it('should adjust option index if target column has fewer options', () => {
      const customOptionCounts = [24, 12, 60]; // Hours, limited minutes, seconds
      const state: DropdownFocusState = { column: 0, option: 20, isActive: true }; // Hour 20
      const action: NavigationAction = { type: 'ARROW_RIGHT' };

      const result = calculateNextFocusState(state, action, maxColumns, customOptionCounts);

      expect(result).toEqual({
        column: 1,
        option: 11, // Adjusted to last minute option (12-1)
        isActive: true,
      });
    });
  });

  describe('ARROW_LEFT navigation', () => {
    it('should move to previous column', () => {
      const state: DropdownFocusState = { column: 1, option: 5, isActive: true };
      const action: NavigationAction = { type: 'ARROW_LEFT' };

      const result = calculateNextFocusState(state, action, maxColumns, optionCounts);

      expect(result).toEqual({
        column: 0,
        option: 5,
        isActive: true,
      });
    });

    it('should wrap to last column when at first column', () => {
      const state: DropdownFocusState = { column: 0, option: 5, isActive: true };
      const action: NavigationAction = { type: 'ARROW_LEFT' };

      const result = calculateNextFocusState(state, action, maxColumns, optionCounts);

      expect(result).toEqual({
        column: 2, // Wrap to seconds column
        option: 5,
        isActive: true,
      });
    });
  });

  describe('ESCAPE and ENTER navigation', () => {
    it('should deactivate focus state on ESCAPE', () => {
      const state: DropdownFocusState = { column: 1, option: 10, isActive: true };
      const action: NavigationAction = { type: 'ESCAPE' };

      const result = calculateNextFocusState(state, action, maxColumns, optionCounts);

      expect(result).toEqual({
        column: 0,
        option: -1,
        isActive: false,
      });
    });

    it('should deactivate focus state on ENTER', () => {
      const state: DropdownFocusState = { column: 2, option: 30, isActive: true };
      const action: NavigationAction = { type: 'ENTER' };

      const result = calculateNextFocusState(state, action, maxColumns, optionCounts);

      expect(result).toEqual({
        column: 0,
        option: -1,
        isActive: false,
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty option counts array', () => {
      const state: DropdownFocusState = { column: 0, option: 0, isActive: true };
      const action: NavigationAction = { type: 'ARROW_DOWN' };
      const emptyOptionCounts: number[] = [];

      const result = calculateNextFocusState(state, action, maxColumns, emptyOptionCounts);

      expect(result).toEqual({
        column: 0,
        option: 0, // Falls back to 1 option, so (0 + 1) % 1 = 0
        isActive: true,
      });
    });

    it('should handle single column navigation', () => {
      const singleMaxColumns = 1;
      const singleOptionCounts = [24];
      const state: DropdownFocusState = { column: 0, option: 10, isActive: true };

      // Left/right should stay in same column
      const rightResult = calculateNextFocusState(state, { type: 'ARROW_RIGHT' }, singleMaxColumns, singleOptionCounts);
      const leftResult = calculateNextFocusState(state, { type: 'ARROW_LEFT' }, singleMaxColumns, singleOptionCounts);

      expect(rightResult.column).toBe(0);
      expect(leftResult.column).toBe(0);
    });
  });
});
