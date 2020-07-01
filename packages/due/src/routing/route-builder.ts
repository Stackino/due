import { Provider, Newable, executeProvider, isStringOrNull, isFunctionOrNull, isFunction, isObjectOrNull, isObject, isString } from '../tools';
import { Routable } from './routable';
import { RouteDeclaration, LayoutRouteDeclaration, PageRouteDeclaration, PageProvider } from './route-declaration';
import { RouteDefaults as RouteDefaults, isRouteDefaultsOrNull } from './route-params';

export type BuildRouteDelegate = (builder: RouteBuilder) => void;

interface RoutedPage<TPage extends Routable = Routable> {
	name: string;
	path: string;
	defaults?: RouteDefaults | null;
	page: PageProvider<TPage>;
}

interface RoutedLayout<TPage extends Routable = Routable> {
	name?: string | null;
	path?: string | null;
	defaults?: RouteDefaults | null;
	page?: PageProvider<TPage>;
}

export class RouteBuilder {
	readonly actions: ((parent: RouteDeclaration) => RouteDeclaration)[] = [];

	layout<TPage extends Routable>(config: RoutedLayout<TPage>, children: BuildRouteDelegate): RouteBuilder;
	layout<TPage extends Routable>(name: string | null, path: string | null, page: PageProvider<TPage> | null, children: BuildRouteDelegate): RouteBuilder;
	layout<TPage extends Routable>(name: string | null, path: string | null, defaults: RouteDefaults | null, page: PageProvider<TPage> | null, children: BuildRouteDelegate): RouteBuilder;
	layout(...args: unknown[]): RouteBuilder {
		if (args.length === 2) {
			const [config, children] = args;
			if (!isObject<RoutedLayout>(config)) {
				throw new Error('Route config must be an object');
			}
			if (!isFunction<BuildRouteDelegate>(children)) {
				throw new Error('Route children must be a function');
			}

			return this.layout(config.name || null, config.path || null, config.defaults || null, config.page || null, children);
		} else if (args.length === 4) {
			const [name, path, page, children] = args;
			if (!isStringOrNull(name)) {
				throw new Error('Route name must be a string or null');
			}
			if (!isStringOrNull(path)) {
				throw new Error('Route path must be a string or null');
			}
			if (!isFunctionOrNull<PageProvider>(page)) {
				throw new Error('Route page must be a function or null');
			}
			if (!isFunction<BuildRouteDelegate>(children)) {
				throw new Error('Route children must be a function');
			}

			return this.layout(name, path, null, page, children);
		} else {
			const [name, path, defaults, page, children] = args;
			if (!isStringOrNull(name)) {
				throw new Error('Route name must be a string or null');
			}
			if (!isStringOrNull(path)) {
				throw new Error('Route path must be a string or null');
			}
			if (!isRouteDefaultsOrNull(defaults)) {
				throw new Error('Route defaults must be a object, map or null');
			}
			if (!isFunctionOrNull<PageProvider>(page)) {
				throw new Error('Route page must be a function or null');
			}
			if (!isFunction<BuildRouteDelegate>(children)) {
				throw new Error('Route children must be a function');
			}

			this.actions.push(parent => {
				const childrenBuilder = new RouteBuilder();
				children(childrenBuilder);
				return new LayoutRouteDeclaration(name, path, defaults, page, parent, (parent) => childrenBuilder.build(parent));
			});

			return this;
		}
	}

	page<TPage extends Routable>(config: RoutedPage<TPage>): RouteBuilder;
	page<TPage extends Routable>(name: string, path: string, page: PageProvider<TPage>): RouteBuilder;
	page<TPage extends Routable>(name: string, path: string, defaults: RouteDefaults | null, page: PageProvider<TPage>): RouteBuilder;
	page(...args: unknown[]): RouteBuilder {
		if (args.length === 1) {
			const [config] = args;
			if (!isObject<RoutedPage>(config)) {
				throw new Error('Route config must be an object');
			}

			return this.page(config.name, config.path, config.defaults || null, config.page);
		} else if (args.length === 3) {
			const [name, path, page] = args;
			if (!isString(name)) {
				throw new Error('Route name must be a string');
			}
			if (!isString(path)) {
				throw new Error('Route path must be a string');
			}
			if (!isFunction<PageProvider>(page)) {
				throw new Error('Route page must be a function');
			}

			return this.page(name, path, null, page);
		} else {
			const [name, path, defaults, page] = args;
			if (!isString(name)) {
				throw new Error('Route name must be a string');
			}
			if (!isString(path)) {
				throw new Error('Route path must be a string');
			}
			if (!isRouteDefaultsOrNull(defaults)) {
				throw new Error('Route defaults must be a object, map or null');
			}
			if (!isFunction<PageProvider>(page)) {
				throw new Error('Route page must be a function');
			}
			
			this.actions.push(parent => new PageRouteDeclaration(name, path, defaults, page, parent));
			
			return this;
		}
	}

	build(parent: RouteDeclaration): RouteDeclaration[] {
		return this.actions.map(action => action(parent));
	}
}
