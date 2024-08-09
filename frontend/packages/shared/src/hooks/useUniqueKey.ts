import { useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ArrayUtils } from '@studio/pure-functions';

type UseUniqueIdsResult = {
  removeKey: (index: number) => void;
  getUniqueKey: (index: number) => string;
};

export type UseUniqueIds = {
  maxNumberOfItems: number;
};

export const useUniqueKey = ({ maxNumberOfItems }: UseUniqueIds): UseUniqueIdsResult => {
  const internalIds = useRef<Array<string>>([]);

  const areInternalIdsInSync = internalIds.current.length === maxNumberOfItems;
  if (!areInternalIdsInSync) {
    internalIds.current = [];
    for (let i = 0; i < maxNumberOfItems; i++) {
      internalIds.current.push(uuidv4());
    }
  }

  const getUniqueKey = (index: number): string => {
    return internalIds.current[index];
  };

  const removeKey = (index: number): void => {
    ArrayUtils.removeItemByIndex(internalIds.current, index);
  };

  return {
    getUniqueKey,
    removeKey,
  };
};
