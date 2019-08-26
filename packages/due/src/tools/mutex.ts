import { delay } from './delay';
import { PromiseCompletitionSource } from './promise-completition-source';

export type MutexReleaser = () => void;

export class Mutex {
	private current: MutexReleaser | null = null;
	private queue: PromiseCompletitionSource<MutexReleaser>[] = [];

	private createReleaser(): MutexReleaser {
		return this.current = () => {
			// short circuit when there is nobody waiting
			if (this.queue.length <= 0) {
				this.current = null;
				return;
			}

			// skip a frame so that next work executes outside of current stack
			setTimeout(() => {
				this.current = null;

				const next = this.queue.shift();
				if (!next) {
					throw new Error('Malformed mutex - no further work');
				}

				next.tryResolve(this.createReleaser());
			}, 0);
		};
	}

	/**
	 * Returns whether mutex is locked or not.
	 */
	get locked() {
		return this.current !== null;
	}

	/**
	 * Attempt to acquire mutex lease.
	 */
	async acquire(): Promise<MutexReleaser>;
	/**
	 * Attempt to acquire mutex lease within given time.
	 * @param timeout Timeout in milliseconds.
	 */
	async acquire(timeout: number): Promise<MutexReleaser | null>;
	async acquire(timeout: number = -1): Promise<MutexReleaser | null> {
		if (this.current === null) {
			return this.createReleaser();
		}

		if (timeout === 0) {
			return null;
		}

		const acquirePromiseCompletitionSource = new PromiseCompletitionSource<MutexReleaser>();

		this.queue.push(acquirePromiseCompletitionSource);

		let acquirePromise: Promise<MutexReleaser | void> = acquirePromiseCompletitionSource.promise;
		if (timeout > -1) {
			const timeoutPromise = delay(timeout);

			acquirePromise = Promise.race([
				acquirePromiseCompletitionSource.promise,
				timeoutPromise
			]);
		}

		const lease = await acquirePromise;
		if (!lease) {
			// timeout expired
			const index = this.queue.indexOf(acquirePromiseCompletitionSource);
			if (index == -1) {
				throw new Error('Malformed mutex - acquire not found after timeout');
			}

			this.queue.splice(index, 1);

			return null;
		}

		return lease;
	}

	async run<T>(action: () => T | Promise<T>) {
		const release = await this.acquire();
		try {
			return await action();
		} finally {
			release();
		}
	}
}
