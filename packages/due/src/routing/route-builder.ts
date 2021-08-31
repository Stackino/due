import { isFunction, isFunctionOrNull, isObject, isString, isStringOrNull } from '../tools';
import { Routable } from './routable';
import { LayoutRouteDeclaration, PageRouteDeclaration, RoutableProvider, RouteDeclaration } from './route-declaration';
import { isRouteDefaultsOrNull, RouteDefaults as RouteDefaults } from './route-params';

export interface PageProps<TPage extends Routable = Routable> {
    name: string;
    path?: string | null;
    defaults?: RouteDefaults | null;
    routable?: RoutableProvider<TPage> | null;
}

export const Page = function <TPage extends Routable = Routable>(props: PageProps<TPage>) {
    throw new Error('Routes cannot be used within document');
}

export interface LayoutProps<TPage extends Routable = Routable> {
    name?: string | null;
    path?: string | null;
    defaults?: RouteDefaults | null;
    routable?: RoutableProvider<TPage> | null;

    children: JSX.Element;
}

export const Layout = function <TPage extends Routable = Routable>(props: LayoutProps<TPage>) {
    throw new Error('Routes cannot be used within document');
}

function isRoute(obj: unknown) {
	return typeof obj === 'object' && obj !== null && ((obj as { type: unknown }).type === Layout || (obj as { type: unknown }).type === Page);
}

function isRouteCollection(obj: unknown) {
	return Array.isArray(obj);
}

function installJsxRoute(element: JSX.Element, builder: RouteBuilder) {
	if (!isRoute(element)) {
		throw new Error(`Only 'Route' elements are allowed for router configuration`);
	}

	const name = element.props?.name ?? null;
	const path = element.props?.path ?? null;
	const defaults = element.props?.defaults ?? null;
	const page = element.props?.page ?? null;

	const children = element.props?.children;

	if (isRoute(children)) {
		builder.layout({ name, path, defaults, page }, builder => {
			installJsxRoute(children, builder);
		});
	} else if (isRouteCollection(children)) {
		builder.layout({ name, path, defaults, page }, builder => {
			for (const child of children) {
				installJsxRoute(child, builder);
			}
		});
	} else {
		builder.page({ name, path, defaults, page });
	}
}

export type BuildRouteDelegate = (builder: RouteBuilder) => void;

export interface RoutedLayout<TPage extends Routable = Routable> {
	name?: string | null;
	path?: string | null;
	defaults?: RouteDefaults | null;
	/** 
	 * @deprecated Use `routable` instead. 
	 **/
	page?: RoutableProvider<TPage>;
	routable?: RoutableProvider<TPage>;
}

export interface RoutedPage<TPage extends Routable = Routable> {
	name: string;
	path?: string;
	defaults?: RouteDefaults | null;
	/** 
	 * @deprecated Use `routable` instead. 
	 **/
	page?: RoutableProvider<TPage>;
	routable?: RoutableProvider<TPage>;
}

export class RouteBuilder {
	readonly actions: ((parent: RouteDeclaration) => RouteDeclaration)[] = [];

	layout<TPage extends Routable>(config: RoutedLayout<TPage>, children: BuildRouteDelegate): RouteBuilder;
	layout<TPage extends Routable>(name: string | null, path: string | null, routable: RoutableProvider<TPage> | null, children: BuildRouteDelegate): RouteBuilder;
	layout<TPage extends Routable>(name: string | null, path: string | null, defaults: RouteDefaults | null, routable: RoutableProvider<TPage> | null, children: BuildRouteDelegate): RouteBuilder;
	layout(...args: unknown[]): RouteBuilder {
		if (args.length === 2) {
			const [config, children] = args;
			if (!isObject<RoutedLayout>(config)) {
				throw new Error('Route config must be an object');
			}
			if (!isFunction<BuildRouteDelegate>(children)) {
				throw new Error('Route children must be a function');
			}

			return this.layout(config.name ?? null, config.path ?? null, config.defaults ?? null, config.routable ?? config.page ?? null, children);
		} else if (args.length === 4) {
			const [name, path, routable, children] = args;
			if (!isStringOrNull(name)) {
				throw new Error('Route name must be a string or null');
			}
			if (!isStringOrNull(path)) {
				throw new Error('Route path must be a string or null');
			}
			if (!isFunctionOrNull<RoutableProvider>(routable)) {
				throw new Error('Route routable must be a function or null');
			}
			if (!isFunction<BuildRouteDelegate>(children)) {
				throw new Error('Route children must be a function');
			}

			return this.layout(name, path, null, routable, children);
		} else {
			const [name, path, defaults, routable, children] = args;
			if (!isStringOrNull(name)) {
				throw new Error('Route name must be a string or null');
			}
			if (!isStringOrNull(path)) {
				throw new Error('Route path must be a string or null');
			}
			if (!isRouteDefaultsOrNull(defaults)) {
				throw new Error('Route defaults must be a object, map or null');
			}
			if (!isFunctionOrNull<RoutableProvider>(routable)) {
				throw new Error('Route routable must be a function or null');
			}
			if (!isFunction<BuildRouteDelegate>(children)) {
				throw new Error('Route children must be a function');
			}

			this.actions.push(parent => {
				const childrenBuilder = new RouteBuilder();
				children(childrenBuilder);
				return new LayoutRouteDeclaration(name, path, defaults, routable, parent, (parent) => childrenBuilder.build(parent));
			});

			return this;
		}
	}

	page<TPage extends Routable>(config: RoutedPage<TPage>): RouteBuilder;
	page<TPage extends Routable>(name: string, path: string | null, routable: RoutableProvider<TPage> | null): RouteBuilder;
	page<TPage extends Routable>(name: string, path: string | null, defaults: RouteDefaults | null, routable: RoutableProvider<TPage> | null): RouteBuilder;
	page(...args: unknown[]): RouteBuilder {
		if (args.length === 1) {
			const [config] = args;
			if (!isObject<RoutedPage>(config)) {
				throw new Error('Route config must be an object');
			}

			return this.page(config.name, config.path ?? null, config.defaults ?? null, config.routable ?? config.page ?? null);
		} else if (args.length === 3) {
			const [name, path, routable] = args;
			if (!isString(name)) {
				throw new Error('Route name must be a string');
			}
			if (!isStringOrNull(path)) {
				throw new Error('Route path must be a string');
			}
			if (!isFunctionOrNull<RoutableProvider>(routable)) {
				throw new Error('Route page must be a function');
			}

			return this.page(name, path, null, routable);
		} else {
			const [name, path, defaults, routable] = args;
			if (!isString(name)) {
				throw new Error('Route name must be a string');
			}
			if (!isStringOrNull(path)) {
				throw new Error('Route path must be a string');
			}
			if (!isRouteDefaultsOrNull(defaults)) {
				throw new Error('Route defaults must be a object, map or null');
			}
			if (!isFunctionOrNull<RoutableProvider>(routable)) {
				throw new Error('Route page must be a function');
			}
			
			this.actions.push(parent => new PageRouteDeclaration(name, path, defaults, routable, parent));
			
			return this;
		}
	}

	jsx(route: JSX.Element): RouteBuilder {
        installJsxRoute(route, this);
		return this;
	}

	build(parent: RouteDeclaration): RouteDeclaration[] {
		return this.actions.map(action => action(parent));
	}
}
