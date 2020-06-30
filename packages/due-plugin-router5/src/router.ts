import { RouteRegistry, pathCombine, Route, Router, RouterHandler, RouterHandlerFactory, RouterHandlerFactoryTag, RouteRegistryTag, RouterTag, Transition, TransitionController, Injectable, ServiceProviderTag } from '@stackino/due';
import { createRouter as createRouter5, NavigationOptions as NavigationOptions5, Plugin as Plugin5, Route as Route5, Router as Router5, State as State5 } from 'router5';
import browserPlugin from 'router5-plugin-browser';
import { DefaultDependencies as Dependencies5 } from 'router5/dist/types/router';
import { Params as Params5 } from 'router5/dist/types/base';
import { Router5PluginOptionsTag } from './plugin-options';

const DATA_MAGIC = "~due~routing~data";
const StackinoTransitionKey = Symbol('Stackino transition');

const noParams: ReadonlyMap<string, string> = new Map();

function params5ToParams(params5: Params5): [ReadonlyMap<string, string>, ReadonlyMap<string | symbol, unknown>] {
	const params = new Map<string, string>();
	let data: Map<string | symbol, unknown> | null = null;

	for (const key in params5) {
		const value = params5[key];

		if (key === DATA_MAGIC) {
			if (value instanceof Map) {
				data = value;
			}
		} else {
			params.set(key, params5[key]);
		}
	}

	if (!data) {
		data = new Map<string | symbol, unknown>();
	}

	return [params, data];
}

function paramsToParams5(params: ReadonlyMap<string, string>, data?: ReadonlyMap<string | symbol, unknown>): { [key: string]: unknown } {
	const params5: { [key: string]: unknown } = {};

	params.forEach((v, k) => {
		params5[k] = v;
	});

	params5[DATA_MAGIC] = data;

	return params5;
}

export class Router5RouterHandler extends Injectable implements RouterHandler {
	private router = this.$dependency(RouterTag);

	constructor(
		private readonly router5: Router5,
		private readonly aliasToName: Map<string, string>,
		private readonly nameToAlias: Map<string, string>
	) {
		super();

		this.router5 = router5;

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

					console.log(`Transition ${fromName ? fromName : 'n/a'} => ${toName} - creating`);

					const [toParams, toData] = params5ToParams(toState.params);

					const transition = this.router.createTransitionToName(this.router.activeTransition, toName, toParams, toData);

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

					console.log(`Transition ${transition.from ? transition.from.to.name : 'n/a'} => ${transition.to.name} - suppressed`);
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

					console.log(`Transition ${transition.from ? transition.from.to.name : 'n/a'} => ${transition.to.name} - failed`);
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

					console.log(`Transition ${transition.from ? transition.from.to.name : 'n/a'} => ${transition.to.name} - success`);
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

	goTo(route: Route, params?: ReadonlyMap<string, string> | undefined, data?: ReadonlyMap<string | symbol, unknown> | undefined): void {
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

		this.router5.navigate(alias, paramsToParams5(params, data), { force: true });
	}
}

export class Router5RouterHandlerFactory extends Injectable implements RouterHandlerFactory {
	private serviceProvider = this.$dependency(ServiceProviderTag);
	private routeRegistry = this.$dependency(RouteRegistryTag);
	private options = this.$dependency(Router5PluginOptionsTag);

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
			router.usePlugin(browserPlugin({
				base: this.options.base,
			}));
		}

		const handler = this.serviceProvider.createFromClass(Router5RouterHandler, router, aliasToName, nameToAlias);

		return handler;
	}
}
