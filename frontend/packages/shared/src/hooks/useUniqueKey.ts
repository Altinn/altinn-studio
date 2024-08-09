import { useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ArrayUtils } from '@studio/pure-functions';

type UseUniqueKey = {
  removeKey: (index: number) => void;
  getUniqueKey: (index: number) => string;
};

export type UseUniqueKeyArgs = {
  maxNumberOfKeys: number;
};

export const useUniqueKey = ({ maxNumberOfKeys }: UseUniqueKeyArgs): UseUniqueKey => {
  const internalUniqueKeys = useRef<Array<string>>([]);

  const areInternalUniqueKeysInSync = internalUniqueKeys.current.length === maxNumberOfKeys;
  if (!areInternalUniqueKeysInSync) {
    internalUniqueKeys.current = [];
    for (let i = 0; i < maxNumberOfKeys; i++) {
      const newlyGeneratedKey = uuidv4();
      internalUniqueKeys.current.push(newlyGeneratedKey);
    }
  }

  const getUniqueKey = (index: number): string => {
    return internalUniqueKeys.current[index];
  };

  const removeKey = (index: number): void => {
    ArrayUtils.removeItemByIndex(internalUniqueKeys.current, index);
  };

  return {
    getUniqueKey,
    removeKey,
  };
};
