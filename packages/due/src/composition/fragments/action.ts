import { createAtom } from 'mobx';
import { DiagnosticsServiceTag } from '../../diagnostics';
import { Injectable, ServiceProvider } from '../../ioc';

const trace = false;

export type ActionSideEffect = () => void;
export type ActionFlowResult = AsyncIterableIterator<ActionSideEffect> | IterableIterator<ActionSideEffect> | PromiseLike<ActionSideEffect | void> | void;
export type ActionFlow<TSelf> = (this: TSelf, ...args: any[]) => ActionFlowResult;

export interface Action<TSelf, TFlow extends ActionFlow<TSelf>> {
	(this: TSelf, ...args: Parameters<TFlow>): void;

	readonly running: boolean;
}

function isIterableIterator<T>(obj: T): obj is Extract<T, IterableIterator<T>> {
	if (!obj) {
		return false;
	}

	return typeof (obj as any).next === 'function' &&
		typeof (obj as any).return === 'function' &&
		typeof (obj as any).throw === 'function' &&
		typeof (obj as any)[Symbol.iterator] === 'function';
}

function isAsyncIterableIterator<T>(obj: T): obj is Extract<T, AsyncIterableIterator<T>> {
	if (!obj) {
		return false;
	}

	return typeof (obj as any).next === 'function' &&
		typeof (obj as any).return === 'function' &&
		typeof (obj as any).throw === 'function' &&
		typeof (obj as any)[Symbol.asyncIterator] === 'function';
}

export function action<TSelf, TFlow extends ActionFlow<TSelf>>(self: TSelf, serviceProvider: ServiceProvider, action: TFlow): Action<TSelf, TFlow> {
	const runningAtom = createAtom('Action \'running\'');
	let runningCounter = 0;
	let idCounter = 0;

	const run = async function (...args: unknown[]): Promise<void> {
		const id = ++idCounter;

		try {
			if (trace) {
				console.info(`action ${id} starting`);
			}

			runningCounter++;
			runningAtom.reportChanged();

			const result = await action.apply(self, args);

			if (!result) {
				// T is () => void
				// T is () => PromiseLike<void>
				if (trace) {
					console.info(`action ${id} has no side effect`);
				}
			} else if (isIterableIterator(result)) {
				// T is () => Iterable<SideEffectAction>
				const iterator = result;

				// todo: don't iterate further if action was superseded?
				for (let r = iterator.next(); !r.done; r = iterator.next()) {
					if (id === idCounter) {
						r.value.call(self);
						if (trace) {
							console.info(`action ${id} applied side effect`);
						}
					} else {
						if (iterator.return) {
							iterator.return();
						}
						if (trace) {
							console.info(`action ${id} ignoring side effect`);
						}
					}
				}
			} else if (isAsyncIterableIterator(result)) {
				// T is () => AsyncIterable<SideEffectAction>
				const iterator = result;

				// todo: don't iterate further if action was superseded?
				for (let r = await iterator.next(); !r.done; r = await iterator.next()) {
					if (id === idCounter) {
						r.value.call(self);
						if (trace) {
							console.info(`action ${id} applied side effect`);
						}
					} else {
						if (iterator.return) {
							await iterator.return();
						}
						if (trace) {
							console.info(`action ${id} ignoring side effect`);
						}
					}
				}
			} else if (typeof result === 'function') {
				// T is () => PromiseLike<SideEffectAction>

				if (id === idCounter) {
					result.call(self);
					if (trace) {
						console.info(`action ${id} applied side effect`);
					}
				} else {
					if (trace) {
						console.info(`action ${id} ignoring side effect`);
					}
				}
			} else {
				throw new Error(`Unexpected side effect in action ${id}`);
			}
		} catch (error) {
			if (trace) {
				console.info(`action ${id} failed`, error);
			}

			const diagnosticsService = serviceProvider.get(DiagnosticsServiceTag);
			diagnosticsService.error(error);
		} finally {
			runningCounter--;
			runningAtom.reportChanged();

			if (trace) {
				console.info(`action ${id} finished`);
			}
		}
	};

	const fn = function (...args: unknown[]): void {
		run(...args);
	};

	Object.defineProperty(fn, 'running', {
		get: () => {
			runningAtom.reportObserved();

			return runningCounter > 0;
		},
	});

	Object.defineProperty(fn, 'run', {
		value: run,
	});

	return fn as unknown as Action<TSelf, TFlow>;
}
