/**
 * Runs `worker` over all items with a bounded number of concurrent operations, and returns the
 * results in input order. Used to avoid sending dozens of independent Gitea requests one by one,
 * while keeping the request burst predictable.
 */
module.exports = async (items, worker, limit = 8) => {
  const results = new Array(items.length);
  let nextIndex = 0;

  const runner = async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await worker(items[index], index);
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runner));
  return results;
};
