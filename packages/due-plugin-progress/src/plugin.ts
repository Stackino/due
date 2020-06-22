import { Plugin, RouterTag, Transition, ServiceProvider } from '@stackino/due';
import { reaction, IReactionDisposer, comparer } from 'mobx';

const topbar = require('topbar');

export class ProgressPlugin extends Plugin {

	private subscription: IReactionDisposer | null = null;
	private running: boolean = false;
	private visible: boolean = false;

	onStarting(services: ServiceProvider): void | Promise<void> {
		if (this.running) {
			throw new Error('Attempt to start running progress plugin');
		}

		const router = services.get(RouterTag);

		this.running = true;

		this.subscription = reaction(
			() => {
				const value: [Transition | null, readonly Transition[]] = [router.activeTransition, router.pendingTransitions];

				return value;
			},
			([activeTransition, pendingTransitions]) => {
				if (pendingTransitions.length <= 0 || (activeTransition && activeTransition.id === router.latestTransitionId)) {
					if (this.visible) {
						topbar.hide();
						this.visible = false;
					}
				} else {
					if (!this.visible) {
						topbar.show();
						this.visible = true;
					}
				}
			},
			{
				delay: 1,
				equals: comparer.structural,
			}
		);
	}

	onStopping(): void | Promise<void> {
		if (!this.running) {
			throw new Error('Attempt to stop stopped progress plugin');
		}

		if (this.subscription) {
			this.subscription();
			this.subscription = null;
		}

		this.running = false;

		return Promise.resolve();
	}
}
