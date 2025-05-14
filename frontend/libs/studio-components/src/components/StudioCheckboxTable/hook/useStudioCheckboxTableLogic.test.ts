import { renderHook, act } from '@testing-library/react';
import { useStudioCheckboxTableLogic } from './useStudioCheckboxTableLogic';
import type { StudioCheckboxTableRowElement } from '../types/StudioCheckboxTableRowElement';
import type { ChangeEvent } from 'react';

// Mock the useCheckboxGroup hook
jest.mock('@digdir/designsystemet-react', () => ({
  useCheckboxGroup: jest.fn(() => ({
    getCheckboxProps: jest.fn((props) => props || {}),
  })),
}));

describe('useStudioCheckboxTableLogic', () => {
  const checkboxTitle = 'Test group';
  const option1 = { value: 'option1', label: 'Option 1', checked: false };
  const option2 = { value: 'option2', label: 'Option 2', checked: false };
  const checkedOption = { value: 'checked', label: 'Checked Option', checked: true };

  it('should initialize with given rowElements', () => {
    const { result } = renderHook(() =>
      useStudioCheckboxTableLogic([option1, option2], checkboxTitle),
    );

    expect(result.current.rowElements).toEqual([option1, option2]);
  });
  /*
  it('should set hasError to true if all are unchecked initially', () => {
    const { result } = renderHook(() =>
      useStudioCheckboxTableLogic([option1, option2], checkboxTitle),
    );

    expect(result.current.hasError).toBe(true);
  });

  it('should set hasError to false if at least one is checked initially', () => {
    const { result } = renderHook(() =>
      useStudioCheckboxTableLogic([checkedOption, option1], checkboxTitle),
    );

    expect(result.current.hasError).toBe(false);
  });

  it('should check single checkbox and update hasError', () => {
    const { result } = renderHook(() => useStudioCheckboxTableLogic([option1], checkboxTitle));

    const mockEvent = {
      target: { value: 'option1', checked: true },
    } as ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleCheckboxChange(mockEvent);
    });

    expect(result.current.rowElements[0].checked).toBe(true);
    expect(result.current.hasError).toBe(false);
  });

  it('should uncheck single checkbox and update hasError if all are unchecked', () => {
    const { result } = renderHook(() =>
      useStudioCheckboxTableLogic([checkedOption], checkboxTitle),
    );

    const mockEvent = {
      target: { value: 'checked', checked: false },
    } as ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleCheckboxChange(mockEvent);
    });

    expect(result.current.rowElements[0].checked).toBe(false);
    expect(result.current.hasError).toBe(true);
  });

  it('should check all checkboxes when value is "all" and checked is true', () => {
    const { result } = renderHook(() =>
      useStudioCheckboxTableLogic([option1, option2], checkboxTitle),
    );

    const mockEvent = {
      target: { value: 'all', checked: true },
    } as ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleCheckboxChange(mockEvent);
    });

    expect(result.current.rowElements.every((el) => el.checked)).toBe(true);
    expect(result.current.hasError).toBe(false);
  });

  it('should uncheck all checkboxes when value is "all" and checked is false', () => {
    const { result } = renderHook(() =>
      useStudioCheckboxTableLogic([checkedOption], checkboxTitle),
    );

    const mockEvent = {
      target: { value: 'all', checked: false },
    } as ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleCheckboxChange(mockEvent);
    });

    expect(result.current.rowElements.every((el) => !el.checked)).toBe(true);
    expect(result.current.hasError).toBe(true);
  });

  it('should return getCheckboxProps from useCheckboxGroup', () => {
    const { result } = renderHook(() => useStudioCheckboxTableLogic([option1], checkboxTitle));

    expect(typeof result.current.getCheckboxProps).toBe('function');
    expect(result.current.getCheckboxProps({ value: 'option1' })).toEqual({ value: 'option1' });
  });*/
});
