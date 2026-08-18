export class KeyedMutex {
    private queues = new Map<string, Promise<void>>();

    async run<T>(key: string, fn: () => Promise<T>): Promise<T> {
        const previous = this.queues.get(key) ?? Promise.resolve();

        let release!: () => void;
        const current = new Promise<void>((resolve) => {
            release = resolve;
        });
        
        const chained = previous.then(() => current);
        this.queues.set(key, chained);

        await previous;

        try {
            return await fn();
        } finally {
            release();
            if (this.queues.get(key) === chained) {
                this.queues.delete(key);
            }
        }
    }
}