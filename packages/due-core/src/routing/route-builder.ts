import { Provider, Newable, executeProvider, isStringOrNull, isFunctionOrNull, isFunction, isObjectOrNull, isObject, isString } from '../tools';
import { Routable } from './routable';
import { RouteDeclaration, LayoutRouteDeclaration, PageRouteDeclaration } from './route-declaration';

export type BuildRouteDelegate = (builder: RouteBuilder) => void;

interface RoutedPage {
	name: string;
	url: string;
	page: Provider<Newable<Routable>>;
}

interface RoutedLayout {
	name?: string | null;
	url?: string | null;
	page?: Provider<Newable<Routable>>;
}

export class RouteBuilder {
	readonly actions: ((parent: RouteDeclaration) => RouteDeclaration)[] = [];

	layout(config: RoutedLayout, children: BuildRouteDelegate): RouteBuilder;
	layout(name: string | null, url: string | null, page: Provider<Newable<Routable>> | null, children: BuildRouteDelegate): RouteBuilder;
	layout(...args: unknown[]): RouteBuilder {
		if (args.length === 2) {
			const [config, children] = args;
			if (!isObject<RoutedLayout>(config)) {
				throw new Error('Route config must be an object');
			}
			if (!isFunction<BuildRouteDelegate>(children)) {
				throw new Error('Route children must be a function');
			}

			this.layout(config.name || null, config.url || null, config.page || null, children);
		} else {
			const [name, url, page, children] = args;
			if (!isStringOrNull(name)) {
				throw new Error('Route name must be a string or null');
			}
			if (!isStringOrNull(url)) {
				throw new Error('Route url must be a string or null');
			}
			if (!isFunctionOrNull<Provider<Newable<Routable>>>(page)) {
				throw new Error('Route page must be a function or null');
			}
			if (!isFunction<BuildRouteDelegate>(children)) {
				throw new Error('Route children must be a function');
			}

			this.actions.push(parent => {
				const childrenBuilder = new RouteBuilder();
				children(childrenBuilder);
				return new LayoutRouteDeclaration(name, url, page, parent, (parent) => childrenBuilder.build(parent));
			});
		}

		return this;
	}

	page(config: RoutedPage): RouteBuilder;
	page(name: string, url: string, page: Provider<Newable<Routable>>): RouteBuilder;
	page(...args: unknown[]): RouteBuilder {
		if (args.length === 1) {
			const [config] = args;
			if (!isObject<RoutedPage>(config)) {
				throw new Error('Route config must be an object');
			}

			this.page(config.name, config.url, config.page);
		} else {
			const [name, url, page] = args;
			if (!isString(name)) {
				throw new Error('Route name must be a string');
			}
			if (!isString(url)) {
				throw new Error('Route url must be a string');
			}
			if (!isFunction<Provider<Newable<Routable>>>(page)) {
				throw new Error('Route page must be a function');
			}
			
			this.actions.push(parent => new PageRouteDeclaration(name, url, page, parent));
		}
		return this;
	}

	build(parent: RouteDeclaration): RouteDeclaration[] {
		return this.actions.map(action => action(parent));
	}
}
