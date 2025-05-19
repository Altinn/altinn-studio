import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { StudioGetCheckboxProps } from '../types/StudioGetCheckboxProps';
import { useCheckboxGroup } from '@digdir/designsystemet-react';

export type UseStudioCheckboxTableLogicResult = {
  selectedValues: string[];
  hasError: boolean;
  getCheckboxProps: (propsOrValue?: string | StudioGetCheckboxProps) => StudioGetCheckboxProps;
  setSelectedValue: Dispatch<SetStateAction<string[]>>;
};

/**
 * Hook that performs the logic for the checkbox table component.
 * It handles the state of the checkboxes and the error state.
 * The hook sets `hasError` to true if the number of selected checkboxes is less than the required number.
 *
 * @param initialOptions the initial options for the checkboxes
 * @param checkBoxTitle the title of the checkbox group
 * @param requiredNumberOfCheckedOptions the minimum number of checkboxes that must be checked
 *
 * @returns an object containing selected values, error state, and a function to get checkbox props
 */
export function useStudioCheckboxTableLogic(
  initialOptions: string[] = [],
  checkBoxTitle: string,
  requiredNumberOfCheckedOptions: number = 1,
): UseStudioCheckboxTableLogicResult {
  const actualRequiredNumber = Math.max(0, requiredNumberOfCheckedOptions);

  const [hasError, setHasError] = useState<boolean>(initialOptions.length < actualRequiredNumber);

  const { getCheckboxProps, value, setValue } = useCheckboxGroup({
    name: checkBoxTitle,
    error: hasError,
    value: initialOptions,
  });

  useEffect(() => {
    const lessOptionsThanRequiredSelected: boolean = value.length < actualRequiredNumber;
    setHasError(lessOptionsThanRequiredSelected);
  }, [actualRequiredNumber, value.length]);

  return {
    selectedValues: value,
    hasError,
    getCheckboxProps,
    setSelectedValue: setValue,
  };
}
