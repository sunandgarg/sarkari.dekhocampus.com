/**
 * Runs asynchronous work with a fixed upper bound while preserving task order.
 * Keeping this scheduler dependency-free makes it safe to use in data hooks.
 */
export async function runWithConcurrency<T>(
  tasks: readonly (() => PromiseLike<T>)[],
  concurrency: number,
): Promise<T[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new RangeError("concurrency must be a positive integer");
  }

  if (tasks.length === 0) return [];

  const results = new Array<T>(tasks.length);
  const workerCount = Math.min(concurrency, tasks.length);
  let nextTaskIndex = 0;
  let stopped = false;

  const worker = async () => {
    while (!stopped && nextTaskIndex < tasks.length) {
      const taskIndex = nextTaskIndex;
      nextTaskIndex += 1;
      try {
        results[taskIndex] = await tasks[taskIndex]();
      } catch (error) {
        stopped = true;
        throw error;
      }
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}
