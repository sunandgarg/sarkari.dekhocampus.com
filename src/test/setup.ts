import "@testing-library/jest-dom";

// Node 26 exposes an unavailable process-level localStorage unless a backing
// file is configured. Keep tests deterministic by using a small in-memory
// implementation, matching the Storage API used by the browser code.
const values = new Map<string, string>();
const testStorage: Storage = {
  get length() { return values.size; },
  clear: () => values.clear(),
  getItem: (key) => values.get(key) ?? null,
  key: (index) => [...values.keys()][index] ?? null,
  removeItem: (key) => { values.delete(key); },
  setItem: (key, value) => { values.set(key, String(value)); },
};
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: testStorage });
Object.defineProperty(window, "localStorage", { configurable: true, value: testStorage });

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

class MockIO {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}
(globalThis as any).IntersectionObserver = MockIO;
(window as any).IntersectionObserver = MockIO;
(globalThis as any).ResizeObserver = MockIO;
