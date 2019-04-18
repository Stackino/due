import 'jest';
import { Mutex, MutexReleaser } from '../../src/tools/mutex';
import { delay } from '../../src/tools/delay';

test('queues further acquire calls', async () => {
    const mutex = new Mutex();

    const log = [];

    let innerPromise: Promise<void> | null = null;

    expect(mutex.locked).toBe(false);

    const release = await mutex.acquire();
    try {
        expect(mutex.locked).toBe(true);

        innerPromise = mutex.acquire()
            .then(innerRelease => {
                log.push('second');

                innerRelease();
            });

        await delay(100);

        log.push('first');
    } finally {
        release();

        // there is a queued item, so mutex shouldn't leave locked state
        expect(mutex.locked).toBe(true);
    }

    await innerPromise;

    expect(mutex.locked).toBe(false);
    expect(log).toEqual(['first', 'second']);
});

test('acquire exits on timeout', async () => {
    const mutex = new Mutex();

    let innerPromise: Promise<void> | null = null;

    expect(mutex.locked).toBe(false);

    const release = await mutex.acquire();
    try {
        expect(mutex.locked).toBe(true);

        await mutex.acquire(100);

        expect(mutex.locked).toBe(true);
    } finally {
        release();
    }

    expect(mutex.locked).toBe(false);
});

test('run exits', async () => {
    const mutex = new Mutex();

    expect(mutex.locked).toBe(false);

    await mutex.run(async () => {
        expect(mutex.locked).toBe(true);

        const releaser = await mutex.acquire(100);
        expect(releaser).toBe(null);

        expect(mutex.locked).toBe(true);
    });

    expect(mutex.locked).toBe(false);
});
