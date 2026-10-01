interface BlobListResult {
  blobs: { key: string }[];
}

const stores = new Map<string, Map<string, string>>();

export function getStore(options: string | { name: string; consistency?: string }) {
  const name = typeof options === 'string' ? options : options.name;
  if (!stores.has(name)) {
    stores.set(name, new Map<string, string>());
  }
  const store = stores.get(name)!;

  return {
    async get(key: string, options?: { type?: 'json' | 'text' }): Promise<unknown> {
      const val = store.get(key);
      if (val === undefined) return null;
      if (options?.type === 'json') {
        try {
          return JSON.parse(val);
        } catch {
          return null;
        }
      }
      return val;
    },
    async set(key: string, value: string): Promise<void> {
      store.set(key, value);
    },
    async delete(key: string): Promise<void> {
      store.delete(key);
    },
    async list(): Promise<BlobListResult> {
      const blobs = Array.from(store.keys()).map((k) => ({ key: k }));
      return { blobs };
    },
  };
}
