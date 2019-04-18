import { Tag, injectable, inject, ContainerTag, Container } from '../ioc';
import { Transition, TransitionController, TransitionStatus } from './transition';
import { Route } from './route';
import { Portalable } from './portalable';
import { RouteRegistryTag, RouteRegistry, RouteDeclaration, State } from '.';
import { PromiseCompletitionSource, executeProvider } from '..';
import { observable } from 'mobx';

export const RouterHandlerFactoryTag = new Tag<RouterHandlerFactory>('Stackino router handler factory');
export const RouterTag = new Tag<Router>('Stackino router');

let _transitionCounter = 0x1000;

/**
 * Router handler contains logic for generating string routes and navigating between them.
 */
export interface RouterHandler {
	pathFor(route: Route, params?: ReadonlyMap<string, string>): string;
	goTo(route: Route, params?: ReadonlyMap<string, string>): void;
}

/**
 * Router handler factory controls creation of new router handlers.
 */
export interface RouterHandlerFactory {
	/**
	 * Create new router handler.
	 * @param main Whether requested router is to be used as main router. Main router handles browser urls whereas subrouters are controlled only programatically.
	 */
	create(main: boolean): Promise<RouterHandler>;
}

export interface Router {
	readonly activeTransition: Transition | null;
	readonly pendingTransitions: ReadonlyArray<Transition>;
	readonly portals: ReadonlyArray<Portalable<unknown, unknown>>;
	readonly latestTransitionId: string | null;

	start(): Promise<void>;

	createTransition(from: Transition | null, to: Route, toParams: ReadonlyMap<string, string>): TransitionController;
	createTransitionToDeclaration(from: Transition | null, declaration: RouteDeclaration, toParams: ReadonlyMap<string, string>): TransitionController;
	createTransitionToId(from: Transition | null, toId: string, toParams: ReadonlyMap<string, string>): TransitionController;
	createTransitionToName(from: Transition | null, toName: string, toParams: ReadonlyMap<string, string>): TransitionController;

	isActive(route: Route, params?: ReadonlyMap<string, string>): boolean;
	isActiveId(id: string, params?: ReadonlyMap<string, string>): boolean;
	isActiveName(name: string, params?: ReadonlyMap<string, string>): boolean;

	pathFor(route: Route, params?: ReadonlyMap<string, string>): string;
	pathForId(id: string, params?: ReadonlyMap<string, string>): string;
	pathForName(name: string, params?: ReadonlyMap<string, string>): string;

	goTo(route: Route, params?: ReadonlyMap<string, string>): void;
	goToId(id: string, params?: ReadonlyMap<string, string>): void;
	goToName(name: string, params?: ReadonlyMap<string, string>): void;

	portal<TInput, TOutput>(portalClass: new () => Portalable<TInput, TOutput>, input: TInput): Promise<TOutput>;
	openPortal<TPortal extends Portalable<TInput, unknown>, TInput>(portalClass: new () => TPortal, input: TInput): Promise<TPortal>;
	waitForPortal<TOutput>(portal: Portalable<unknown, TOutput>): Promise<TOutput>;
	closePortal<TOutput>(portal: Portalable<unknown, TOutput>): Promise<TOutput>;

	stop(): Promise<void>;
}

class PortalLifecycle {
	constructor(
		container: Container,
		portalClass: new () => Portalable<unknown, unknown>,
		private input: unknown
	) {
		this.portal = new portalClass();
		container.inject(this.portal);
	}

	readonly portal: Portalable<unknown, unknown>;

	private finishedSource = new PromiseCompletitionSource<unknown>();
	get finished(): Promise<unknown> { return this.finishedSource.promise; }

	async enter(): Promise<void> {
		if (this.portal.enter) {
			const commit = await this.portal.enter(this.input);

			if (typeof commit === 'function') {
				commit();
			}
		}
	}

	async exit(): Promise<unknown> {
		let result: unknown = undefined;

		if (this.portal.exit) {
			const commit = await this.portal.exit();

			if (typeof commit === 'function') {
				result = commit();
			} else {
				result = commit;
			}
		}

		this.finishedSource.tryResolve(result);

		return result;
	}
}

@injectable(RouterTag)
export class DefaultRouter implements Router {
	@inject(ContainerTag)
	private readonly container!: Container;

	@inject(RouteRegistryTag)
	private readonly routeRegistry!: RouteRegistry;

	@inject(RouterHandlerFactoryTag)
	private readonly routerHandlerFactory!: RouterHandlerFactory;

	private handler: RouterHandler | null = null;

	private _latestTransitionId: string | null = null;
	get latestTransitionId(): string | null {
		return this._latestTransitionId;
	}

	private activeTranstionValue = observable.box<Transition | null>(null);
	get activeTransition(): Transition | null {
		return this.activeTranstionValue.get();
	}

	private pendingTransitionsValue = observable.box<Transition[]>([]);
	get pendingTransitions(): Transition[] {
		return this.pendingTransitionsValue.get();
	}

	async start(): Promise<void> {
		if (this.handler) {
			throw new Error('Attempt to start running router');
		}

		this._latestTransitionId = null;
		this.handler = await this.routerHandlerFactory.create(true);
	}

	createTransition(from: Transition | null, to: Route, toParams: ReadonlyMap<string, string>): TransitionController {
		const transitionId = this._latestTransitionId = `${_transitionCounter++}`;

		const transition = new TransitionController(transitionId, from, to, toParams);
		this.container.inject(transition);

		const nextPendingTransitions = this.pendingTransitions.slice();
		nextPendingTransitions.push(transition);
		this.pendingTransitionsValue.set(nextPendingTransitions);

		(async () => {
			await transition.finished;

			const nextPendingTransitions = this.pendingTransitions.filter(t => t !== transition);
			this.pendingTransitionsValue.set(nextPendingTransitions);

			if (transition.status === TransitionStatus.finished) {
				this.activeTranstionValue.set(transition);
			}
		})();

		return transition;
	}

	createTransitionToDeclaration(from: Transition | null, toDeclaration: RouteDeclaration, toParams: ReadonlyMap<string, string>): TransitionController {
		const to = this.routeRegistry.getByDeclaration(toDeclaration);

		return this.createTransition(from, to, toParams);
	}

	createTransitionToId(from: Transition | null, toId: string, toParams: ReadonlyMap<string, string>): TransitionController {
		const to = this.routeRegistry.getById(toId);

		return this.createTransition(from, to, toParams);
	}

	createTransitionToName(from: Transition | null, toName: string, toParams: ReadonlyMap<string, string>): TransitionController {
		const to = this.routeRegistry.getByName(toName);

		return this.createTransition(from, to, toParams);
	}

	isActive(route: Route, _params?: ReadonlyMap<string, string>): boolean {
		if (!this.handler) {
			throw new Error('Attempt to use stopped router');
		}

		const transition = this.activeTransition;
		if (!transition) {
			return false;
		}

		// todo: check params
		return transition.active.findIndex(s => s.route === route) !== -1;
	}

	isActiveId(id: string, params?: ReadonlyMap<string, string>): boolean {
		if (!this.handler) {
			throw new Error('Attempt to use stopped router');
		}

		const route = this.routeRegistry.getById(id);

		return this.isActive(route, params);
	}

	isActiveName(name: string, params?: ReadonlyMap<string, string>): boolean {
		if (!this.handler) {
			throw new Error('Attempt to use stopped router');
		}

		const route = this.routeRegistry.getByName(name);

		return this.isActive(route, params);
	}

	pathFor(route: Route, params?: ReadonlyMap<string, string>): string {
		if (!this.handler) {
			throw new Error('Attempt to use stopped router');
		}

		if (!route.name) {
			throw new Error(`Route '${route.id}' is not navigable`);
		}

		return this.handler.pathFor(route, params);
	}

	pathForId(id: string, params?: ReadonlyMap<string, string>): string {
		if (!this.handler) {
			throw new Error('Attempt to use stopped router');
		}

		const route = this.routeRegistry.getById(id);

		return this.pathFor(route, params);
	}

	pathForName(name: string, params?: ReadonlyMap<string, string>): string {
		if (!this.handler) {
			throw new Error('Attempt to use stopped router');
		}

		const route = this.routeRegistry.getByName(name);

		return this.pathFor(route, params);
	}

	goTo(route: Route, params?: ReadonlyMap<string, string>): void {
		if (!this.handler) {
			throw new Error('Attempt to use stopped router');
		}

		return this.handler.goTo(route, params);
	}

	goToId(id: string, params?: ReadonlyMap<string, string>): void {
		if (!this.handler) {
			throw new Error('Attempt to use stopped router');
		}

		const route = this.routeRegistry.getById(id);

		this.goTo(route, params);
	}

	goToName(name: string, params?: ReadonlyMap<string, string>): void {
		if (!this.handler) {
			throw new Error('Attempt to use stopped router');
		}

		const route = this.routeRegistry.getByName(name);

		this.goTo(route, params);
	}

	// portals - todo: move

	private portalLifecycles: Map<Portalable<unknown, unknown>, PortalLifecycle> = new Map();
	private portalsValue = observable.box<Portalable<unknown, unknown>[]>([]);
	get portals(): Portalable<unknown, unknown>[] {
		return this.portalsValue.get();
	}

	async portal<TInput, TOutput>(portalClass: new () => Portalable<TInput, TOutput>, input: TInput): Promise<TOutput> {
		const portal = await this.openPortal(portalClass, input);

		return this.waitForPortal(portal);
	}

	async openPortal<TPortal extends Portalable<TInput, unknown>, TInput>(portalClass: new () => TPortal, input: TInput): Promise<TPortal> {
		if (!this.handler || !this.portals) {
			throw new Error('Attempt to use stopped router');
		}

		const lifecycle = new PortalLifecycle(this.container, portalClass, input);
		this.portalLifecycles.set(lifecycle.portal, lifecycle);

		const nextPortals: Portalable<unknown, unknown>[] = [];
		nextPortals.push.apply(nextPortals, this.portals);
		nextPortals.push(lifecycle.portal);
		this.portalsValue.set(nextPortals);

		await lifecycle.enter();

		return lifecycle.portal as TPortal;
	}

	async waitForPortal<TOutput>(portal: Portalable<unknown, TOutput>): Promise<TOutput> {
		if (!this.handler || !this.portals) {
			throw new Error('Attempt to use stopped router');
		}

		const lifecycle = this.portalLifecycles.get(portal);

		if (!lifecycle) {
			throw new Error('Attempt to wait for non-existing portal');
		}

		const result = await lifecycle.finished;

		return result as TOutput;
	}

	async closePortal<TOutput>(portal: Portalable<unknown, TOutput>): Promise<TOutput> {
		if (!this.handler || !this.portals) {
			throw new Error('Attempt to use stopped router');
		}

		const lifecycle = this.portalLifecycles.get(portal);

		if (!lifecycle) {
			throw new Error('Attempt to close non-existing portal');
		}

		let result = await lifecycle.exit();

		const nextPortals: Portalable<unknown, unknown>[] = [];
		nextPortals.push.apply(nextPortals, this.portals);
		const index = nextPortals.indexOf(lifecycle.portal);
		if (index !== -1) {
			nextPortals.splice(index, 1);
		}
		this.portalsValue.set(nextPortals);

		this.portalLifecycles.delete(portal);

		return result as TOutput;
	}

	// /portals

	stop(): Promise<void> {
		if (!this.handler) {
			throw new Error('Attempt to stop stopped router');
		}

		//this.mainRouterHandler.stop();
		this._latestTransitionId = null;
		this.handler = null;

		return Promise.resolve();
	}
}
