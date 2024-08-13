import { useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ArrayUtils } from '@studio/pure-functions';

type UseUniqueKey = {
  removeUniqueKey: (index: number) => void;
  getUniqueKey: (index: number) => string;
};

export type UseUniqueKeyArgs = {
  numberOfKeys: number;
};

export const useUniqueKeys = ({ numberOfKeys }: UseUniqueKeyArgs): UseUniqueKey => {
  const internalUniqueKeys = useRef<Array<string>>([]);

  const generateUniqueKeys = (): Array<string> => {
    const newlyGeneratedKeys = [];
    for (let i = 0; i < numberOfKeys; i++) {
      const newlyGeneratedKey = uuidv4();
      newlyGeneratedKeys.push(newlyGeneratedKey);
    }
    return newlyGeneratedKeys;
  };

  const areInternalUniqueKeysOutOfSync = internalUniqueKeys.current.length !== numberOfKeys;
  if (areInternalUniqueKeysOutOfSync) {
    internalUniqueKeys.current = generateUniqueKeys();
  }

  const getUniqueKey = (index: number): string => {
    return internalUniqueKeys.current[index];
  };

  const removeUniqueKey = (index: number): void => {
    ArrayUtils.removeItemByIndex(internalUniqueKeys.current, index);
  };

  return {
    getUniqueKey,
    removeUniqueKey,
  };
};
