/**
 * Very simple helper to just swap two items in an array
 * @param arr
 * @param itemA
 * @param itemB
 */
export const swapArrayElements = (arr: any[], itemA: any, itemB: any) => {
  const out = [...arr];
  const indexA = arr.indexOf(itemA);
  const indexB = arr.indexOf(itemB);
  out[indexA] = arr[indexB];
  out[indexB] = arr[indexA];
  return out;
};

export const removeArrayElement = (arr: any[], item: any) => {
  const out = [...arr];
  const index = arr.indexOf(item);
  if (index > -1) {
    // only splice array when item is found
    out.splice(index, 1); // 2nd parameter means remove one item only
  }
  return out;
};

export const insertArrayElementAtPos = (
  arr: any[],
  item: any,
  targetPos: number,
) => {
  if (targetPos < 0) {
    throw Error(`Cant insert element at array position ${targetPos}`);
  }
  const out = [...arr];
  if (targetPos >= arr.length) {
    out.push(item);
  } else {
    out.splice(targetPos, 0, item);
  }
  return out;
};
