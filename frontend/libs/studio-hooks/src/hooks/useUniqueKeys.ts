import { useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ArrayUtils } from '@studio/pure-functions';

export type UseUniqueKey = {
  addUniqueKey: () => void;
  removeUniqueKey: (index: number) => void;
  getUniqueKey: (index: number) => string;
};

export type UseUniqueKeyArgs = {
  numberOfKeys: number;
};

export const useUniqueKeys = ({ numberOfKeys }: UseUniqueKeyArgs): UseUniqueKey => {
  const internalUniqueKeys = useRef<Array<string>>([]);

  const areInternalUniqueKeysOutOfSync = internalUniqueKeys.current.length !== numberOfKeys;
  if (areInternalUniqueKeysOutOfSync) {
    internalUniqueKeys.current = generateUniqueKeys(numberOfKeys);
  }

  const getUniqueKey = (index: number): string => {
    return internalUniqueKeys.current[index];
  };

  const addUniqueKey = (): void => {
    internalUniqueKeys.current = [...internalUniqueKeys.current, generateUniqueKey()];
  };

  const removeUniqueKey = (index: number): void => {
    internalUniqueKeys.current = ArrayUtils.removeItemByIndex(internalUniqueKeys.current, index);
  };

  return {
    addUniqueKey,
    getUniqueKey,
    removeUniqueKey,
  };
};

const generateUniqueKeys = (numberOfKeys: number): Array<string> => {
  const newlyGeneratedKeys: string[] = [];
  for (let i = 0; i < numberOfKeys; i++) {
    newlyGeneratedKeys.push(generateUniqueKey());
  }
  return newlyGeneratedKeys;
};

const generateUniqueKey = (): string => {
  return uuidv4();
};
