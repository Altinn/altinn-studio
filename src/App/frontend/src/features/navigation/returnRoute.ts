export function getReturnRoute(
  order: readonly string[],
  currentPage: string | undefined,
  returnPage: string,
): string[] | undefined {
  const currentIndex = currentPage === undefined ? -1 : order.indexOf(currentPage);
  const returnIndex = order.indexOf(returnPage);
  if (currentIndex === -1 || returnIndex === -1) {
    return undefined;
  }
  return order.slice(Math.min(currentIndex, returnIndex), Math.max(currentIndex, returnIndex) + 1);
}
