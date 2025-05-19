import { renderHook } from '@testing-library/react';
import type { RenderHookResult } from '@testing-library/react';
import { useStudioCheckboxTable } from './useStudioCheckboxTable';
import type { UseStudioCheckboxTableResult } from './useStudioCheckboxTable';

const mockCheckboxTitle: string = 'Test group';
const option1: string = 'Option 1';
const option2: string = 'Option 2';
const options: string[] = [option1, option2];

describe('useStudioCheckboxTableLogic', () => {
  it('should initialize with given values', () => {
    const { result } = renderUseStudioCheckboxTableLogic(options, 1);
    expect(result.current.selectedValues).toEqual(options);
  });

  it('should have error if fewer than required number of checkboxes are selected', () => {
    const { result } = renderUseStudioCheckboxTableLogic([option1], 2);
    expect(result.current.hasError).toBe(true);
  });

  it('should not have error if required number of checkboxes are selected', () => {
    const { result } = renderUseStudioCheckboxTableLogic(options, 2);
    expect(result.current.hasError).toBe(false);
  });
});

const renderUseStudioCheckboxTableLogic = (
  initialOptions: string[],
  minCountCheckedOptions: number,
): RenderHookResult<UseStudioCheckboxTableResult, unknown> => {
  return renderHook(() =>
    useStudioCheckboxTable(initialOptions, mockCheckboxTitle, minCountCheckedOptions),
  );
};
