export class PromiseCompletitionSource<T> {
	constructor() {
		this.promise = new Promise<T>((resolve, reject) => {
			this.resolve = resolve;
			this.reject = reject;
		});
	}

	private resolve!: (value: T | PromiseLike<T>) => void;
	private reject!: (reason?: unknown) => void;

	promise: Promise<T>;

	tryResolve(value: T | PromiseLike<T>): void {
		this.resolve(value);
	}

	tryReject(reason: unknown): void {
		this.reject(reason);
	}
}
