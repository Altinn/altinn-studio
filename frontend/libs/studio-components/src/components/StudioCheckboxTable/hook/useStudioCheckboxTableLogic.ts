import type { ChangeEvent } from 'react';
import { useState } from 'react';
import type { StudioGetCheckboxProps } from '../types/StudioGetCheckboxProps';
import { useCheckboxGroup } from '@digdir/designsystemet-react';
import type { StudioCheckboxTableRowElement } from '../types/StudioCheckboxTableRowElement';

export type UseStudioCheckboxTableLogicResult = {
  rowElements: StudioCheckboxTableRowElement[];
  hasError: boolean;
  getCheckboxProps: (propsOrValue?: string | StudioGetCheckboxProps) => StudioGetCheckboxProps;
  handleCheckboxChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

/**
 * Hook that performs the logic for the checkbox table component.
 * It handles the state of the checkboxes and the error state.
 * It also provides the props for the checkboxes and the change handler.
 * The hook sets `hasError` to true if all checkboxes are unchecked, e.g.,
 * minimum 1 checkbox must be checked. This can be extended for more cases later.
 *
 * @param initialOptions the initial options for the checkboxes
 * @param checkBoxTitle the title of the checkbox group
 *
 * @returns an object containing the state of the checkboxes, the error state,
 * the props for the checkboxes, and the change handler
 */
export function useStudioCheckboxTableLogic(
  initialOptions: StudioCheckboxTableRowElement[],
  checkBoxTitle: string,
): UseStudioCheckboxTableLogicResult {
  const [rowElements, setRowElements] = useState<StudioCheckboxTableRowElement[]>(initialOptions);
  const [hasError, setHasError] = useState<boolean>(
    initialOptions.every((element) => !element.checked), // TODO FUNCTION
  );

  const { getCheckboxProps } = useCheckboxGroup({
    name: checkBoxTitle,
    error: hasError,
    value: rowElements.filter((element) => element.checked).map((element) => element.value), // TODO FUNCTION
  });

  const handleCheckboxChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const value: string = event.target.value;
    const checked: boolean = event.target.checked;

    // IF 1
    if (value !== 'all' && checked) {
      handleCheckSingleCheckbox(value);
    }

    // IF 2
    if (value !== 'all' && !checked) {
      // THE ISSUE IS THAT THIS IS CALLED AFTER IF 4 IS CALLED AND THEREFORE THE CHECKBOX STATE IS NOT UPDATED
      handleUnCheckSingleCheckbox(value);
    }

    // IF 3
    if (value === 'all' && checked) {
      handleChangeAllCheckboxes(true);
    }

    // IF 4
    if (value === 'all' && !checked) {
      handleChangeAllCheckboxes(false);
    }
  };

  const handleCheckSingleCheckbox = (value: string): void => {
    setHasError(false);
    const newRowElements: StudioCheckboxTableRowElement[] = changeCheckedOnCheckboxClicked(
      rowElements,
      value,
      true,
    );
    setRowElements(newRowElements);
  };

  const handleUnCheckSingleCheckbox = (value: string): void => {
    const newRowElements: StudioCheckboxTableRowElement[] = changeCheckedOnCheckboxClicked(
      rowElements,
      value,
      false,
    );
    const allAreUnchecked: boolean = getAllUnchecked(newRowElements);

    if (allAreUnchecked) {
      setHasError(true);
    }
    setRowElements(newRowElements);
  };

  const handleChangeAllCheckboxes = (checked: boolean): void => {
    setHasError(!checked);
    const newRowElements: StudioCheckboxTableRowElement[] = changeCheckedOnAllCheckboxes(
      rowElements,
      checked,
    );
    setRowElements(newRowElements);
  };

  return {
    rowElements,
    hasError,
    getCheckboxProps,
    handleCheckboxChange,
  };
}

function changeCheckedOnCheckboxClicked(
  rowElements: StudioCheckboxTableRowElement[],
  valueClicked: string,
  isChecked: boolean,
): StudioCheckboxTableRowElement[] {
  return rowElements.map((element) =>
    element.value === valueClicked ? { ...element, checked: isChecked } : element,
  );
}

function getAllUnchecked(rowElements: StudioCheckboxTableRowElement[]): boolean {
  return rowElements.every((element) => !element.checked);
}

function changeCheckedOnAllCheckboxes(
  rowElements: StudioCheckboxTableRowElement[],
  checked: boolean,
): StudioCheckboxTableRowElement[] {
  return rowElements.map((element) => ({ ...element, checked }));
}
