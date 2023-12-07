export interface JsonPatch {
  op: 'replace' | 'add' | 'remove';
  path: string;
  value: string | number;
}

export const createReplacePatch = <T>(diff: T): JsonPatch[] => {
  return Object.keys(diff).map((key) => {
    return {
      op: 'replace',
      path: `/${key}`,
      value: diff[key],
    };
  });
};
