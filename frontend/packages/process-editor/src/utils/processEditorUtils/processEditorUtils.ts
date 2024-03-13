import type { BpmnDetails } from '../../types/BpmnDetails';

/**
 * Returns true if the version is 8 or higher, and false otherwise
 *
 * @param version the version to check
 *
 * @returns boolean
 */
export const supportsProcessEditor = (version: string): boolean => {
  const firstNumber: number = Number(version[0]);
  return firstNumber > 7;
};

/**
 * Updates the data task tracking lists
 * Adds the provided item to the primary list and removes it from the secondary list (if it exists there)
 * @param updatePrimaryList The function to update the primary list by adding the new item
 * @param updateSecondaryList The function to update the secondary list by removing the item
 * @param itemToAdd The item to add to the primary list
 * @param secondaryList The secondary list to remove the item from
 */
export const updateDataTaskTrackingLists = (
  updatePrimaryList: React.Dispatch<React.SetStateAction<BpmnDetails[]>>,
  updateSecondaryList: React.Dispatch<React.SetStateAction<BpmnDetails[]>>,
  itemToAdd: BpmnDetails,
  secondaryList: BpmnDetails[],
) => {
  if (itemToAdd?.taskType !== 'data') {
    return;
  }
  updatePrimaryList((prevItems: BpmnDetails[]) => [...prevItems, itemToAdd]);
  if (secondaryList.some((task) => task.id === itemToAdd.id)) {
    updateSecondaryList((prevItems) => prevItems.filter((task) => task.id !== itemToAdd.id));
  }
};
