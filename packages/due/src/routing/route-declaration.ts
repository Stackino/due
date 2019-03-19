import { Provider, Newable } from '../tools';
import { Routable } from './routable';
import { validRouteNameRegex } from './constants';

/**
 * Base for all route types. Holds minimum information required for all route types.
 */
export class RouteDeclaration {
	/**
	 * Constructs new `RouteDeclaration`.
	 * @param name Route name consisting from alphanumeric characters.
	 * @param path Relative path to parent route.
	 * @param page Page attached to this route.
	 */
	constructor(name: string | null, path: string | null, page: Provider<Newable<Routable>>) {
		if (name && !validRouteNameRegex.test(name)) {
			throw new Error(`Route name '${name}' contains invalid characters`);
		}

		this.name = name;
		this.path = path;
		this.page = page;
	}

	public readonly name: string | null;
	public readonly path: string | null;
	public readonly page: Provider<Newable<Routable>>;
}

/**
 * Child route is a route with a parent.
 */
export interface ChildRouteDeclaration extends RouteDeclaration {
	readonly parent: RouteDeclaration;
}

/**
 * Root route is the root of routing tree. It is the only route that has no parent.
 */
export class RootRouteDeclaration extends RouteDeclaration {
	constructor(page: Provider<Newable<Routable>>, children: Provider<RouteDeclaration[]>) {
		super(null, null, page);

		this.children = children;
	}

	public readonly children: Provider<RouteDeclaration[]>;
}

/**
 * Layout route is a branch in the route tree - it must contains at least one child route.
 */
export class LayoutRouteDeclaration extends RouteDeclaration implements ChildRouteDeclaration {
	constructor(name: string | null, url: string | null, page: Provider<Newable<Routable>>, parent: RouteDeclaration, children: Provider<RouteDeclaration[]>) {
		super(name, url, page);

		this.parent = parent;
		this.children = children;
	}

	public readonly parent: RouteDeclaration;
	public readonly children: Provider<RouteDeclaration[]>;
}

/**
 * Page route is a leaf in the route tree - it cannot branch any further.
 */
export class PageRouteDeclaration extends RouteDeclaration implements ChildRouteDeclaration {
	constructor(name: string, url: string, page: Provider<Newable<Routable>>, parent: RouteDeclaration) {
		super(name, url, page);

		this.parent = parent;
	}

	public readonly parent: RouteDeclaration;
}
