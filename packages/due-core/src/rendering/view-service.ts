import { inject, injectable, Tag } from '../ioc';
import { RenderService, RenderServiceTag } from '../rendering';
import { Portal, Router, RouterTag, Transition } from '../routing';
import { reaction, comparer, IReactionDisposer } from 'mobx';

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

	private subscription: IReactionDisposer | null = null;

	private activeTransition: Transition | null = null;
	private activePortals: readonly Portal<unknown, unknown>[] | null = null;
	private running: boolean = false;

	start(): Promise<void> {
		if (this.running) {
			throw new Error('Attempt to start running view service');
		}

		this.running = true;

		this.subscription = reaction(
			() => {
				const value: [Transition | null, readonly Portal<unknown, unknown>[]] = [this.router.activeTransition, this.router.portals];

				return value;	
			}, 
			([activeTransition, portals]) => {
				if (this.activeTransition !== activeTransition || this.activePortals !== portals) {
					this.renderService.render(activeTransition, portals);

					this.activeTransition = activeTransition;
					this.activePortals = portals;
				}
			},
			{
				delay: 1,				
			}
		);

		return Promise.resolve();
	}

	stop(): Promise<void> {
		if (!this.running) {
			throw new Error('Attempt to stop stopped view service');
		}

		if (this.subscription) {
			this.subscription();
			this.subscription = null;
		}

		this.running = false;

		return Promise.resolve();
	}
}
