export function areEqualIgnoringOrder(arr1?: string[] | null, arr2?: string[] | null): boolean {
  if (!arr1 && !arr2) {
    return true;
  }

  if (!arr1 || !arr2) {
    return false;
  }

  if (arr1.length !== arr2.length) {
    return false;
  }

  const freq = new Map<string, number>();
  for (const item of arr1) {
    freq.set(item, (freq.get(item) || 0) + 1);
  }

  for (const item of arr2) {
    if (!freq.has(item)) {
      return false;
    }
    const newCount = freq.get(item)! - 1;
    if (newCount < 0) {
      return false;
    }
    freq.set(item, newCount);
  }

  return true;
}
