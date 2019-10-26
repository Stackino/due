import { createAtom } from 'mobx';
import { action, Action, ActionFlowResult } from './action';

export interface Timer<TSelf> {
	/**
	 * Action that is being periodically executed.
	 */
	readonly action: Action<TSelf, () => ActionFlowResult>;

	/**
	 * Returns whether action is currently running.
	 */
	readonly running: boolean;
	/**
	 * Returns whether timer is currently counting down to next execution.
	 */
	readonly enabled: boolean;

	enable(): void;
	disable(): void;
}

export function timer<TSelf>(self: TSelf, timeout: number, handler: () => ActionFlowResult): Timer<TSelf> {
	const enabledAtom = createAtom('Timer \'enabled\'');

	// nodejs and browsers have different interfaces (number vs object) for representing timer handlers
	let interval: any = null;

	return {
		action: action(self, handler),
		get running() { return this.action.running; },
		get enabled() { return interval !== null; },

		enable() {
			if (interval !== null) {
				throw new Error('Timer is already running.');
			}

			interval = setInterval(this.action, timeout);
			enabledAtom.reportChanged();
		},

		disable() {
			if (interval === null) {
				throw new Error('Timer is not running.');
			}

			clearInterval(interval);
			interval = null;
			enabledAtom.reportChanged();
		}
	};
}