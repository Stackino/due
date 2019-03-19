import { createAtom } from 'mobx';
import { ContainerKey } from '..';
import { DiagnosticsServiceTag } from '../diagnostics';
import { Container } from '../ioc';

// TODO: move mobx to plugin?

const trace = false;

type Flow<TSelf> = (this: TSelf, ...args: any[]) => (AsyncIterableIterator<SideEffect> | IterableIterator<SideEffect> | PromiseLike<SideEffect | void> | void);
type SideEffect = () => void;

export interface Action<TSelf, TFlow extends Flow<TSelf>> {
	(this: TSelf, ...args: Parameters<TFlow>): void;

	readonly isRunning: boolean;
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

export function action<TSelf, TFlow extends Flow<TSelf>>(self: TSelf, action: TFlow): Action<TSelf, TFlow> {
	let isRunningAtom = createAtom('User action \'isRunning\'');
	let isRunningCounter = 0;
	let idCounter = 0;

	let run = async function (...args: unknown[]): Promise<void> {
		const id = ++idCounter;

		try {
			if (trace) {
				console.info(`action ${id} starting`);
			}

			isRunningCounter++;
			isRunningAtom.reportChanged();

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

			const container = (self as any)[ContainerKey] as Container;
			if (container) {
				const diagnosticsService = container.get(DiagnosticsServiceTag);

				diagnosticsService.error(error);
			}
		} finally {
			isRunningCounter--;
			isRunningAtom.reportChanged();

			if (trace) {
				console.info(`action ${id} finished`);
			}
		}
	};

	let fn = function (...args: unknown[]): void {
		run(...args);
	};

	Object.defineProperty(fn, 'isRunning', {
		get: () => {
			isRunningAtom.reportObserved();

			return isRunningCounter > 0;
		},
	});

	Object.defineProperty(fn, 'run', {
		value: run,
	});

	return fn as unknown as Action<TSelf, TFlow>;
}
