import type { IParty } from 'src/types/shared';

export const flattenParties = (parties: IParty[]): IParty[] => {
  const result: IParty[] = [];
  const stack = [...parties];

  while (stack.length) {
    const current = stack.pop();
    if (current) {
      result.push(current);
      if (current.childParties) {
        stack.push(...current.childParties);
      }
    }
  }

  return result;
};
