import { Tag, Injectable, ServiceProviderTag } from '../ioc';
import { Transition, TransitionController, TransitionStatus } from './transition';
import { Route } from './route';
import { Portal, PortalController, PortalLifecycle } from './portal';
import { RouteRegistryTag, RouteRegistry, RouteDeclaration, State } from '.';
import { PromiseCompletitionSource, executeProvider } from '..';
import { observable, when } from 'mobx';
import { RouteParams, RouteData, normalizeRouteParams, normalizeRouteData, normalizeOptionalRouteParams, normalizeOptionalRouteData, applyRouteDefaults } from './route-params';

export const RouterHandlerFactoryTag = new Tag<RouterHandlerFactory>('Stackino router handler factory');
export const RouterTag = new Tag<Router>('Stackino router');

let _transitionCounter = 0x1000;

/**
 * Router handler contains logic for generating string routes and navigating between them.
 */
export interface RouterHandler {
	pathFor(route: Route, params?: ReadonlyMap<string, string>): string;
	goTo(route: Route, params?: ReadonlyMap<string, string>, data?: ReadonlyMap<string | symbol, unknown>): void;
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
	readonly pendingTransitions: readonly Transition[];
	readonly portals: readonly Portal<unknown, unknown>[];
	readonly latestTransitionId: string | null;

	start(): Promise<void>;

	createTransition(from: Transition | null, to: Route, toParams: RouteParams, toData: RouteData): TransitionController;
	createTransitionToDeclaration(from: Transition | null, declaration: RouteDeclaration, toParams: RouteParams, toData: RouteData): TransitionController;
	createTransitionToId(from: Transition | null, toId: string, toParams: RouteParams, toData: RouteData): TransitionController;
	createTransitionToName(from: Transition | null, toName: string, toParams: RouteParams, toData: RouteData): TransitionController;

	isActive(route: Route, params?: RouteParams): boolean;
	isActiveId(id: string, params?: RouteParams): boolean;
	isActiveName(name: string, params?: RouteParams): boolean;

	pathFor(route: Route, params?: RouteParams): string;
	pathForId(id: string, params?: RouteParams): string;
	pathForName(name: string, params?: RouteParams): string;

	goTo(route: Route, params?: RouteParams, data?: RouteData): void;
	goToId(id: string, params?: RouteParams, data?: RouteData): void;
	goToName(name: string, params?: RouteParams, data?: RouteData): void;

	portal<TInput, TOutput>(portalClass: new (controller: PortalController<TInput, TOutput>) => Portal<TInput, TOutput>, input: TInput): Promise<TOutput | null>;
	openPortal<TPortal extends Portal<TInput, TOutput>, TInput, TOutput>(portalClass: new (controller: PortalController<TInput, TOutput>) => TPortal, input: TInput): Promise<TPortal>;
	waitForPortal<TOutput>(portal: Portal<unknown, TOutput>): Promise<TOutput | null>;
	closePortal<TOutput>(portal: Portal<unknown, TOutput>): Promise<TOutput | null>;

	stop(): Promise<void>;
}

export class DefaultRouter extends Injectable implements Router {
	private readonly serviceProvider = this.$dependency(ServiceProviderTag);
	private readonly routeRegistry = this.$dependency(RouteRegistryTag);
	private readonly routerHandlerFactory = this.$dependency(RouterHandlerFactoryTag);

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

	createTransition(from: Transition | null, to: Route, toParams: RouteParams, toData: RouteData): TransitionController {
		toParams = normalizeRouteParams(toParams);
		toData = normalizeRouteData(toData);

		const transitionId = this._latestTransitionId = `${_transitionCounter++}`;

		const transition = this.serviceProvider.createFromClass(TransitionController, transitionId, from, to, toParams, toData);

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

	createTransitionToDeclaration(from: Transition | null, toDeclaration: RouteDeclaration, toParams: RouteParams, toData: RouteData): TransitionController {
		const to = this.routeRegistry.getByDeclaration(toDeclaration);

		return this.createTransition(from, to, toParams, toData);
	}

	createTransitionToId(from: Transition | null, toId: string, toParams: RouteParams, toData: RouteData): TransitionController {
		const to = this.routeRegistry.getById(toId);

		return this.createTransition(from, to, toParams, toData);
	}

	createTransitionToName(from: Transition | null, toName: string, toParams: RouteParams, toData: RouteData): TransitionController {
		const to = this.routeRegistry.getByName(toName);

		return this.createTransition(from, to, toParams, toData);
	}

	isActive(route: Route, params?: RouteParams): boolean {
		if (!this.handler) {
			throw new Error('Attempt to use stopped router');
		}

		const transition = this.activeTransition;
		if (!transition) {
			return false;
		}

		const normalizedParams = normalizeOptionalRouteParams(params);

		return transition.active.findIndex(s => Route.equals(s.route, transition.toParams, route, normalizedParams)) !== -1;
	}

	isActiveId(id: string, params?: RouteParams): boolean {
		if (!this.handler) {
			throw new Error('Attempt to use stopped router');
		}

		const route = this.routeRegistry.getById(id);

		return this.isActive(route, params);
	}

	isActiveName(name: string, params?: RouteParams): boolean {
		if (!this.handler) {
			throw new Error('Attempt to use stopped router');
		}

		const route = this.routeRegistry.getByName(name);

		return this.isActive(route, params);
	}

	pathFor(route: Route, params?: RouteParams): string {
		if (!this.handler) {
			throw new Error('Attempt to use stopped router');
		}

		if (!route.name) {
			throw new Error(`Route '${route.id}' is not navigable`);
		}

		const normalizedParams = normalizeOptionalRouteParams(params) || new Map();
		applyRouteDefaults(this.activeTransition, normalizedParams, route.fullDefaults);

		return this.handler.pathFor(route, normalizedParams);
	}

	pathForId(id: string, params?: RouteParams): string {
		if (!this.handler) {
			throw new Error('Attempt to use stopped router');
		}

		const route = this.routeRegistry.getById(id);

		return this.pathFor(route, params);
	}

	pathForName(name: string, params?: RouteParams): string {
		if (!this.handler) {
			throw new Error('Attempt to use stopped router');
		}

		const route = this.routeRegistry.getByName(name);

		return this.pathFor(route, params);
	}

	goTo(route: Route, params?: RouteParams, data?: RouteData): void {
		if (!this.handler) {
			throw new Error('Attempt to use stopped router');
		}

		const normalizedParams = normalizeOptionalRouteParams(params) || new Map();
		applyRouteDefaults(this.activeTransition, normalizedParams, route.fullDefaults);

		const normalizedData = normalizeOptionalRouteData(data);

		return this.handler.goTo(route, normalizedParams, normalizedData);
	}

	goToId(id: string, params?: RouteParams, data?: RouteData): void {
		if (!this.handler) {
			throw new Error('Attempt to use stopped router');
		}

		const route = this.routeRegistry.getById(id);

		this.goTo(route, params, data);
	}

	goToName(name: string, params?: RouteParams, data?: RouteData): void {
		if (!this.handler) {
			throw new Error('Attempt to use stopped router');
		}

		const route = this.routeRegistry.getByName(name);

		this.goTo(route, params, data);
	}

	// portals - todo: move?

	private portalLifecycles: Map<Portal<unknown, unknown>, PortalLifecycle> = new Map();
	private portalsValue = observable.box<Portal<unknown, unknown>[]>([]);
	get portals(): Portal<unknown, unknown>[] {
		return this.portalsValue.get();
	}

	portal<TOutput>(portalClass: new (controller: PortalController<void, TOutput>) => Portal<void, TOutput>): Promise<TOutput | null>;
	portal<TInput, TOutput>(portalClass: new (controller: PortalController<TInput, TOutput>) => Portal<TInput, TOutput>, input: TInput): Promise<TOutput | null>;
	async portal<TInput, TOutput>(portalClass: new (controller: PortalController<TInput, TOutput>) => Portal<TInput, TOutput>, input?: TInput): Promise<TOutput | null> {
		const portal = await this.openPortal(portalClass, input as TInput);

		return this.waitForPortal(portal as Portal<unknown, TOutput>);
	}

	async openPortal<TPortal extends Portal<TInput, TOutput>, TInput, TOutput>(portalClass: new (controller: PortalController<TInput, TOutput>) => TPortal, input: TInput): Promise<TPortal> {
		if (!this.handler || !this.portals) {
			throw new Error('Attempt to use stopped router');
		}

		const lifecycle = new PortalLifecycle(this.serviceProvider, portalClass as any /* todo: can we make this safer? */, input);
		this.portalLifecycles.set(lifecycle.instance, lifecycle);

		const nextPortals: Portal<unknown, unknown>[] = [];
		nextPortals.push(...this.portals);
		nextPortals.push(lifecycle.instance);
		this.portalsValue.set(nextPortals);

		lifecycle.finished.then(() => {
			const nextPortals: Portal<unknown, unknown>[] = [];
			nextPortals.push(...this.portals);
			const index = nextPortals.indexOf(lifecycle.instance);
			if (index !== -1) {
				nextPortals.splice(index, 1);
			}
			this.portalsValue.set(nextPortals);
	
			this.portalLifecycles.delete(lifecycle.instance);
		});

		await lifecycle.open();

		return lifecycle.instance as any /* todo: can we make this safer? */;
	}

	async waitForPortal<TOutput>(portal: Portal<unknown, TOutput>): Promise<TOutput | null> {
		if (!this.handler || !this.portals) {
			throw new Error('Attempt to use stopped router');
		}

		const lifecycle = this.portalLifecycles.get(portal as Portal<unknown, unknown>);

		if (!lifecycle) {
			throw new Error('Attempt to wait for non-existing portal');
		}

		await lifecycle.finished;

		return lifecycle.controller.output as TOutput;
	}

	async closePortal<TOutput>(portal: Portal<unknown, TOutput>): Promise<TOutput | null> {
		if (!this.handler || !this.portals) {
			throw new Error('Attempt to use stopped router');
		}

		const lifecycle = this.portalLifecycles.get(portal as Portal<unknown, unknown>);

		if (!lifecycle) {
			throw new Error('Attempt to close non-existing portal');
		}

		await lifecycle.close();

		return lifecycle.controller.output as TOutput;
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
