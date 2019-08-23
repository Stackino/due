import { Provider, Newable } from '../tools';
import { Routable } from './routable';
import { validRouteNameRegex } from './constants';

export type PageProvider = Provider<Newable<Routable> | { default: Newable<Routable> }>;

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
	constructor(name: string | null, path: string | null, page: PageProvider | null) {
		if (name && !validRouteNameRegex.test(name)) {
			throw new Error(`Route name '${name}' contains invalid characters`);
		}

		this.name = name;
		this.path = path;
		this.page = page;
	}

	public readonly name: string | null;
	public readonly path: string | null;
	public readonly page: PageProvider | null;
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
	constructor(page: PageProvider, children: (parent: RouteDeclaration) => RouteDeclaration[]) {
		super(null, null, page);

		this.children = children(this);
	}

	public readonly children: RouteDeclaration[];
}

/**
 * Layout route is a branch in the route tree - it must contains at least one child route.
 */
export class LayoutRouteDeclaration extends RouteDeclaration implements ChildRouteDeclaration {
	constructor(name: string | null, url: string | null, page: PageProvider | null, parent: RouteDeclaration, children: (parent: RouteDeclaration) => RouteDeclaration[]) {
		super(name, url, page);

		this.parent = parent;
		this.children = children(this);
	}

	public readonly parent: RouteDeclaration;
	public readonly children: RouteDeclaration[];
}

/**
 * Page route is a leaf in the route tree - it cannot branch any further.
 */
export class PageRouteDeclaration extends RouteDeclaration implements ChildRouteDeclaration {
	constructor(name: string, url: string, page: PageProvider, parent: RouteDeclaration) {
		super(name, url, page);

		this.parent = parent;
	}

	public readonly parent: RouteDeclaration;
}
