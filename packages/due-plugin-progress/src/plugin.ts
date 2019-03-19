import { Container, Plugin, RouterTag } from '@stackino/due';
import { combineLatest, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

const topbar = require('topbar');

export class ProgressPlugin implements Plugin {
	configureServices(container: Container): void {

	}

	private subscription: Subscription = new Subscription();
	private running: boolean = false;
	private visible: boolean = false;

	start(services: Container): Promise<void> {
		if (this.running) {
			throw new Error('Attempt to start running progress plugin');
		}

		const router = services.get(RouterTag);

		this.running = true;

		this.subscription.add(
			combineLatest(router.activeTransition, router.pendingTransitions)
				.pipe(debounceTime(0))
				.subscribe(async ([activeTransition, pendingTransitions]) => {
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

					// console.log('progress', activeTransition, pendingTransitions);
				})
		);

		return Promise.resolve();
	}

	stop(): Promise<void> {
		if (!this.running) {
			throw new Error('Attempt to stop stopped progress plugin');
		}

		this.subscription.unsubscribe();
		this.subscription = new Subscription();

		this.running = false;

		return Promise.resolve();
	}
}
