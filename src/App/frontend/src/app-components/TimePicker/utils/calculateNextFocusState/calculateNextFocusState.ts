import type { DropdownFocusState, NavigationAction } from 'src/app-components/TimePicker/types';

/**
 * Calculates the next focus state based on the current state and navigation action
 * @param current - Current dropdown focus state
 * @param action - Navigation action to perform
 * @param maxColumns - Maximum number of columns in the dropdown
 * @param optionCounts - Array of option counts for each column
 * @returns New dropdown focus state
 */
export const calculateNextFocusState = (
  current: DropdownFocusState,
  action: NavigationAction,
  maxColumns: number,
  optionCounts: number[],
): DropdownFocusState => {
  if (!current.isActive) {
    return current;
  }

  switch (action.type) {
    case 'ARROW_DOWN': {
      const currentColumnOptions = optionCounts[current.column] || 1;
      return {
        ...current,
        option: (current.option + 1) % currentColumnOptions,
      };
    }

    case 'ARROW_UP': {
      const currentColumnOptions = optionCounts[current.column] || 1;
      return {
        ...current,
        option: (current.option - 1 + currentColumnOptions) % currentColumnOptions,
      };
    }

    case 'ARROW_RIGHT': {
      const newColumn = (current.column + 1) % maxColumns;
      return {
        column: newColumn,
        option: Math.min(current.option, (optionCounts[newColumn] || 1) - 1),
        isActive: true,
      };
    }

    case 'ARROW_LEFT': {
      const newColumn = (current.column - 1 + maxColumns) % maxColumns;
      return {
        column: newColumn,
        option: Math.min(current.option, (optionCounts[newColumn] || 1) - 1),
        isActive: true,
      };
    }

    case 'ESCAPE':
    case 'ENTER': {
      return {
        column: 0,
        option: -1,
        isActive: false,
      };
    }

    default:
      return current;
  }
};
