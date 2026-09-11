import { describe, expect, it } from "vitest";
import { runWithConcurrency } from "./runWithConcurrency";

describe("runWithConcurrency", () => {
  it("never exceeds the requested concurrency and preserves result order", async () => {
    let activeTasks = 0;
    let peakActiveTasks = 0;
    const completionOrder: number[] = [];
    const delays = [24, 4, 18, 2, 10];

    const tasks = delays.map((delay, index) => async () => {
      activeTasks += 1;
      peakActiveTasks = Math.max(peakActiveTasks, activeTasks);
      await new Promise((resolve) => setTimeout(resolve, delay));
      completionOrder.push(index);
      activeTasks -= 1;
      return `result-${index}`;
    });

    await expect(runWithConcurrency(tasks, 2)).resolves.toEqual([
      "result-0",
      "result-1",
      "result-2",
      "result-3",
      "result-4",
    ]);
    expect(peakActiveTasks).toBe(2);
    expect(completionOrder).not.toEqual([0, 1, 2, 3, 4]);
  });

  it("does not start queued work after a worker observes a rejection", async () => {
    const started: number[] = [];
    const error = new Error("read failed");
    let finishSecondTask: (() => void) | undefined;
    const tasks = [
      async () => {
        started.push(0);
        throw error;
      },
      async () => {
        started.push(1);
        await new Promise<void>((resolve) => {
          finishSecondTask = resolve;
        });
        return 1;
      },
      async () => {
        started.push(2);
        return 2;
      },
    ];

    const result = runWithConcurrency(tasks, 2);
    await expect(result).rejects.toBe(error);
    finishSecondTask?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(started).toEqual([0, 1]);
  });

  it("rejects invalid concurrency instead of silently skipping work", async () => {
    await expect(runWithConcurrency([async () => 1], 0)).rejects.toThrow(RangeError);
  });
});
