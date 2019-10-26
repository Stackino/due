import { createAtom, reaction as mobxReaction, IReactionDisposer } from 'mobx';
import { action, Action, ActionFlowResult } from './action';

export interface Reaction<TSelf, TData> {
	/**
	 * Action that is being executed upon condition change.
	 */
	readonly action: Action<TSelf, (data: TData) => ActionFlowResult>;

	/**
	 * Returns whether action is currently running.
	 */
	readonly running: boolean;
	/**
	 * Returns whether reaction is currently watching expression.
	 */
	readonly enabled: boolean;

	enable(): void;
	disable(): void;
}

export function reaction<TSelf, TData>(self: TSelf, expression: () => TData, handler: (data: TData) => ActionFlowResult): Reaction<TSelf, TData> {
	const enabledAtom = createAtom('Reaction \'enabled\'');
	let disposer: IReactionDisposer | null = null;

	return {
		action: action(self, handler),
		get running() { return this.action.running; },
		get enabled() { return !!disposer; },

		enable() {
			if (disposer) {
				throw new Error('Reaction is already enabled.');
			}

			disposer = mobxReaction(expression, data => this.action.call(self, data));
			enabledAtom.reportChanged();
		},

		disable() {
			if (!disposer) {
				throw new Error('Reaction is not enabled.');
			}

			disposer();
			disposer = null;
			enabledAtom.reportChanged();
		}
	};
}