import { act, renderHook } from '@testing-library/react';
import type { RenderHookResult } from '@testing-library/react';
import { useStudioCheckboxTableLogic } from './useStudioCheckboxTableLogic';
import type { UseStudioCheckboxTableLogicResult } from './useStudioCheckboxTableLogic';
import type { StudioCheckboxTableRowElement } from '../types/StudioCheckboxTableRowElement';
import type { ChangeEvent } from 'react';
import { checkedOption, mockCheckboxTitle, option1, option2 } from '../mocks';

type Resullt = {
  current: UseStudioCheckboxTableLogicResult;
};

function clickAndSimulateCheckboxClick(
  result: Resullt,
  value: string,
  oldCheckedValue: boolean,
): void {
  const mockEvent = {
    target: { value, checked: !oldCheckedValue },
  } as ChangeEvent<HTMLInputElement>;

  act(() => {
    result.current.handleCheckboxChange(mockEvent);
  });
}

describe('useStudioCheckboxTableLogic', () => {
  beforeEach(jest.clearAllMocks);

  it('should initialize with given rowElements', () => {
    const { result } = renderUseStudioCheckboxTableLogic([option1, option2]);
    expect(result.current.rowElements).toEqual([option1, option2]);
  });

  it('should set hasError to true if all options are unchecked initially', () => {
    const { result } = renderUseStudioCheckboxTableLogic([option1, option2]);
    expect(result.current.hasError).toBe(true);
  });

  it('should set hasError to false if at least one option is checked initially', () => {
    const { result } = renderUseStudioCheckboxTableLogic([option1, checkedOption]);
    expect(result.current.hasError).toBe(false);
  });

  it('should check single checkbox and update hasError', () => {
    const { result } = renderUseStudioCheckboxTableLogic([option1]);
    clickAndSimulateCheckboxClick(result, option1.value, option1.checked);
    expect(result.current.rowElements[0].checked).toBe(true);
    expect(result.current.hasError).toBe(false);
  });

  it('should uncheck single checkbox and update hasError if all are unchecked', () => {
    const { result } = renderUseStudioCheckboxTableLogic([checkedOption]);
    clickAndSimulateCheckboxClick(result, checkedOption.value, checkedOption.checked);
    expect(result.current.rowElements[0].checked).toBe(false);
    expect(result.current.hasError).toBe(true);
  });

  it('should check all checkboxes when value is "all" and checked is true', () => {
    const { result } = renderUseStudioCheckboxTableLogic([option1, option2]);
    clickAndSimulateCheckboxClick(result, 'all', false);
    expect(result.current.rowElements.every((el) => el.checked)).toBe(true);
    expect(result.current.hasError).toBe(false);
  });

  it('should uncheck all checkboxes when value is "all" and checked is false', () => {
    const { result } = renderUseStudioCheckboxTableLogic([checkedOption]);
    clickAndSimulateCheckboxClick(result, 'all', true);
    expect(result.current.rowElements.every((el) => !el.checked)).toBe(true);
    expect(result.current.hasError).toBe(true);
  });

  it('should return getCheckboxProps from useCheckboxGroup', () => {
    const { result } = renderUseStudioCheckboxTableLogic([option1]);
    expect(result.current.getCheckboxProps({ value: option1.value })).toEqual(
      expect.objectContaining({
        'aria-invalid': !option1.checked,
        checked: option1.checked,
        value: 'option1',
        name: mockCheckboxTitle,
        onChange: expect.any(Function),
      }),
    );
  });
});

const renderUseStudioCheckboxTableLogic = (
  initialOptions: StudioCheckboxTableRowElement[],
  checkboxTitle: string = mockCheckboxTitle,
): RenderHookResult<UseStudioCheckboxTableLogicResult, unknown> => {
  return renderHook(() => useStudioCheckboxTableLogic(initialOptions, checkboxTitle));
};
