import type { ChangeEvent } from 'react';
import { useState } from 'react';
import type { StudioGetCheckboxProps } from '../types/StudioGetCheckboxProps';
import { useCheckboxGroup } from '@digdir/designsystemet-react';

export interface StudioCheckboxTableRowElement {
  label: string;
  value: string;
  checked: boolean;
}

interface UseCheckboxTableLogicResult {
  rowElements: StudioCheckboxTableRowElement[];
  hasError: boolean;
  getCheckboxProps: (propsOrValue?: string | StudioGetCheckboxProps) => StudioGetCheckboxProps;
  handleCheckboxChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

export function useCheckboxTableLogic(
  initialOptions: StudioCheckboxTableRowElement[],
): UseCheckboxTableLogicResult {
  const [rowElements, setRowElements] = useState<StudioCheckboxTableRowElement[]>(initialOptions);
  const [hasError, setHasError] = useState<boolean>(
    initialOptions.every((element) => !element.checked),
  );

  const { getCheckboxProps } = useCheckboxGroup({
    name: 'test',
    error: hasError,
  });

  const handleCheckSingleCheckbox = (value: string): void => {
    setHasError(false);
    const newRowElements = changeCheckedOnCheckboxClicked(rowElements, value, true);
    setRowElements(newRowElements);
  };

  const handleUnCheckSingleCheckbox = (value: string): void => {
    const newRowElements = changeCheckedOnCheckboxClicked(rowElements, value, false);
    const allAreUnchecked = getAllUnchecked(newRowElements);

    if (allAreUnchecked) {
      setHasError(true);
    }
    setRowElements(newRowElements);
  };

  const handleChangeAllCheckboxes = (checked: boolean): void => {
    setHasError(!checked);
    const newRowElements = changeCheckedOnAllCheckboxes(rowElements, checked);
    setRowElements(newRowElements);
  };

  const handleCheckboxChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const { value, checked } = event.target;

    if (value === 'all') {
      handleChangeAllCheckboxes(checked);
    } else if (checked) {
      handleCheckSingleCheckbox(value);
    } else {
      handleUnCheckSingleCheckbox(value);
    }
  };

  return {
    rowElements,
    hasError,
    getCheckboxProps,
    handleCheckboxChange,
  };
}

// --- Helpers ---

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
