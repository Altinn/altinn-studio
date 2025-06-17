export function makeLikertChildId(parentId: string, rowIndex: number | undefined) {
  if (rowIndex === undefined) {
    return `${parentId}-item`;
  }
  return `${parentId}-item-${rowIndex}`;
}
