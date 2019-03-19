import { combineLatest, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { inject, injectable, Tag } from '../ioc';
import { RenderService, RenderServiceTag } from '../rendering';
import { Portalable, Router, RouterTag, Transition } from '../routing';

export const ViewServiceTag = new Tag<ViewService>('Stackino view service');

export interface ViewService {
	start(): Promise<void>;
	stop(): Promise<void>;
}

@injectable(ViewServiceTag)
export class DefaultViewService implements ViewService {
	@inject(RouterTag)
	private readonly router!: Router;

	@inject(RenderServiceTag)
	private readonly renderService!: RenderService;

	private subscription: Subscription = new Subscription();

	private activeTransition: Transition | null = null;
	private activePortals: ReadonlyArray<Portalable<unknown, unknown>> | null = null;
	private running: boolean = false;

	start(): Promise<void> {
		if (this.running) {
			throw new Error('Attempt to start running view service');
		}

		this.running = true;

		this.subscription.add(
			combineLatest(this.router.activeTransition, this.router.portals)
				.pipe(debounceTime(0))
				.subscribe(async ([activeTransition, portals]) => {
					if (this.activeTransition !== activeTransition || this.activePortals !== portals) {
						this.renderService.render(activeTransition, portals);

						this.activeTransition = activeTransition;
						this.activePortals = portals;
					}
				})
		);

		return Promise.resolve();
	}

	stop(): Promise<void> {
		if (!this.running) {
			throw new Error('Attempt to stop stopped view service');
		}

		this.subscription.unsubscribe();
		this.subscription = new Subscription();

		this.running = false;

		return Promise.resolve();
	}
}
