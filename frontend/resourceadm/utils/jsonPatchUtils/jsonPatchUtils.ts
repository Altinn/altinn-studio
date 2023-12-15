export interface JsonPatch {
  op: 'replace' | 'add' | 'remove';
  path: string;
  value?: string | number;
}

export const createReplacePatch = <T>(diff: T): JsonPatch[] => {
  return Object.keys(diff).map((key) => {
    const isRemove = !diff[key];
    return {
      op: isRemove ? 'remove' : 'replace',
      path: `/${key}`,
      ...(!isRemove && { value: diff[key] }),
    };
  });
};
