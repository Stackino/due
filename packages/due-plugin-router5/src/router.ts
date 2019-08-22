import { Constructed, DefaultContainer, ContainerTag, inject, injectable, RouteRegistry, pathCombine, Route, Router, RouterHandler, RouterHandlerFactory, RouterHandlerFactoryTag, RouteRegistryTag, RouterTag, Transition, TransitionController } from '@stackino/due-core';
import { createRouter as createRouter5, Dependencies as Dependencies5, NavigationOptions as NavigationOptions5, Plugin as Plugin5, Route as Route5, Router as Router5, State as State5 } from 'router5';
import browserPlugin from 'router5-plugin-browser';
import { Params as Params5 } from 'router5/types/types/base';

const StackinoTransitionKey = Symbol('Stackino transition');

const noParams: ReadonlyMap<string, string> = new Map();

function params5ToParams(params5: Params5): ReadonlyMap<string, string> {
	const params = new Map<string, string>();

	for (const key in params5) {
		params.set(key, params5[key]);
	}

	return params;
}

function paramsToParams5(params: ReadonlyMap<string, string>): { [key: string]: unknown } {
	const params5: { [key: string]: unknown } = {};

	params.forEach((v, k) => {
		params5[k] = v;
	});

	return params5;
}

export class Router5RouterHandler implements RouterHandler {
	@inject(RouterTag)
	private router!: Router;

	constructor(
		private readonly router5: Router5,
		private readonly aliasToName: Map<string, string>,
		private readonly nameToAlias: Map<string, string>
	) {
		this.router5 = router5;
	}

	[Constructed] = () => {
		this.router5.useMiddleware(() => async (toState, fromState) => {
			const transition = (toState as any)[StackinoTransitionKey] as unknown;
			if (!(transition instanceof TransitionController)) {
				throw new Error(`Entered invalid state '${toState.name}' without transition`);
			}

			await transition.execute();

			return toState;
		});

		this.router5.usePlugin((router?: Router5, dependencies?: Dependencies5): Plugin5 => {
			return {
				onStart(): void {
					void 0;
				},
				onTransitionStart: (toState?: State5, fromState?: State5): void => {
					if (!toState) {
						// ??
						console.warn('Received no `toState`');
						return;
					}

					const fromName = fromState ? (this.aliasToName.get(fromState.name) || fromState.name) : null;
					let toName: string;
					if (toState.name === '@@router5/UNKNOWN_ROUTE') {
						toName = 'error.not-found';
					} else {
						toName = this.aliasToName.get(toState.name) || toState.name;
					}

					console.groupCollapsed(`Transition ${fromName ? fromName : 'n/a'} => ${toName} - creating`);
					console.log('previous route ', fromState);
					console.log('current route  ', toState);
					console.groupEnd();

					const transition = this.router.createTransitionToName(this.router.activeTransition, toName, params5ToParams(toState.params));

					(toState as any)[StackinoTransitionKey] = transition;
				},
				onTransitionCancel: (toState?: State5, fromState?: State5): void => {
					if (!toState) {
						// ??
						console.warn('Received no `toState`');
						return;
					}

					const transition = (toState as any)[StackinoTransitionKey] as unknown;
					if (!(transition instanceof TransitionController)) {
						throw new Error(`Entered invalid state '${toState.name}' without transition`);
					}

					transition.suppress();

					console.groupCollapsed(`Transition ${transition.from ? transition.from.to.name : 'n/a'} => ${transition.to.name} - suppressed`);
					console.log('previous route ', fromState);
					console.log('current route  ', toState);
					console.groupEnd();
				},
				onTransitionError(toState?: State5, fromState?: State5, err?: any): void {
					if (!toState) {
						// ??
						console.warn('Received no `toState`');
						return;
					}

					const transition = (toState as any)[StackinoTransitionKey] as unknown;
					if (!(transition instanceof TransitionController)) {
						throw new Error(`Entered invalid state '${toState.name}' without transition`);
					}

					transition.fail(err);

					console.groupCollapsed(`Transition ${transition.from ? transition.from.to.name : 'n/a'} => ${transition.to.name} - failed`);
					console.log('previous route ', fromState);
					console.log('current route  ', toState);
					console.groupEnd();
				},
				onTransitionSuccess: (toState?: State5, fromState?: State5, opts?: NavigationOptions5): void => {
					if (!toState) {
						// ??
						console.warn('Received no `toState`');
						return;
					}

					const transition = (toState as any)[StackinoTransitionKey] as unknown;
					if (!(transition instanceof TransitionController)) {
						throw new Error(`Entered invalid state '${toState.name}' without transition`);
					}

					transition.finish();

					console.groupCollapsed(`Transition ${transition.from ? transition.from.to.name : 'n/a'} => ${transition.to.name} - success`);
					console.log('previous route ', fromState);
					console.log('current route  ', toState);
					console.groupEnd();
				},
				onStop(): void {
					void 0;
				},
				teardown(): void {
					void 0;
				}
			};
		});

		this.router5.start();
	}

	pathFor(route: Route, params?: ReadonlyMap<string, string> | undefined): string {
		if (!this.router5 || !this.nameToAlias) {
			throw new Error('Attempt to use stopped router');
		}

		if (!route.name) {
			throw new Error(`Route '${route.id}' is not navigable`);
		}

		const alias = this.nameToAlias.get(route.name) || route.name;

		if (!params) {
			params = noParams;
		}

		return this.router5.buildPath(alias, paramsToParams5(params));
	}

	goTo(route: Route, params?: ReadonlyMap<string, string> | undefined): void {
		if (!this.router5 || !this.nameToAlias) {
			throw new Error('Attempt to use stopped router');
		}

		if (!route.name) {
			throw new Error(`Route '${route.id}' is not navigable`);
		}

		const alias = this.nameToAlias.get(route.name) || route.name;

		if (!params) {
			params = noParams;
		}

		this.router5.cancel();

		this.router5.navigate(alias, paramsToParams5(params), { force: true });
	}
}

@injectable(RouterHandlerFactoryTag)
export class Router5RouterHandlerFactory implements RouterHandlerFactory {
	@inject(ContainerTag)
	private container!: DefaultContainer;

	@inject(RouteRegistryTag)
	private routeRegistry!: RouteRegistry;

	async create(main: boolean): Promise<RouterHandler> {
		const aliasToName = new Map<string, string>();
		const nameToAlias = new Map<string, string>();

		const route5s: Route5[] = [];
		
		for (const route of this.routeRegistry.root.descendants) {
			const name = route.name;
			let path = route.path;

			if (!name || !path) {
				// nameless + pathless route callbacks are handled within `route-registry`
				// nameless / pathless routes are handled within child routes
				continue;
			}

			let alias = route.declaration.name!;
			let parent = route.parent;
			while (parent) {
				if (parent.name) {
					//name = `${parent.declaration.name}.${name}`;
					if (!parent.path) {
						alias = `${parent.declaration.name}___${alias}`;
					} else {
						alias = `${parent.declaration.name}.${alias}`;
					}
				}

				if (!parent.name && parent.path) {
					path = pathCombine('/', parent.path, path);
				}

				parent = parent.parent;
			}

			if (alias !== name) {
				if (aliasToName.has(alias)) {
					throw new Error(`Duplicate alias -> name '${alias}' -> '${name}'`);
				}
				if (nameToAlias.has(alias)) {
					throw new Error(`Duplicate name -> alias '${name}' -> '${alias}'`);
				}

				aliasToName!.set(alias, name);
				nameToAlias!.set(name, alias);
			}

			route5s.push({ name: alias, path });
		}
		route5s.sort((a, b) => {
			const aSegments = a.name.split('.');
			const bSegments = b.name.split('.');

			for (let i = 0; i < Math.min(aSegments.length, bSegments.length); i++) {
				const aSegment = aSegments[i];
				const bSegment = bSegments[i];

				if (aSegment === bSegment) {
					continue;
				} else if (aSegment > bSegment) {
					return 1;
				} else {
					return -1;
				}
			}

			if (aSegments.length === bSegments.length) {
				return 0;
			} else if (aSegments.length > bSegments.length) {
				return 1;
			} else {
				return -1;
			}
		});

		const router = createRouter5(route5s, {
			allowNotFound: true,
			trailingSlashMode: 'never',
		});
		if (main) {
			router.usePlugin(browserPlugin({}));
		}

		const handler = new Router5RouterHandler(router, aliasToName, nameToAlias);
		this.container.inject(handler);
		return handler;
	}
}
