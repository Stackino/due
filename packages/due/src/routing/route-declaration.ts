import { Newable, Provider } from '../tools';
import { validRouteNameRegex } from './constants';
import { Routable } from './routable';
import { normalizeRouteDefaults, RouteDefaults, RouteDefaultValue } from './route-params';

export type RoutableProvider<TRoutable extends Routable = Routable> = Provider<Newable<TRoutable> | { default: Newable<TRoutable> }>;

/**
 * Base for all route types. Holds minimum information required for all route types.
 */
export class RouteDeclaration {
	/**
	 * Constructs new `RouteDeclaration`.
	 * @param name Route name consisting from alphanumeric characters.
	 * @param path Relative path to parent route.
	 * @param routable Routable attached to this route.
	 */
	constructor(name: string | null, path: string | null, paramDefaults: RouteDefaults | null, routable: RoutableProvider | null) {
		if (name && !validRouteNameRegex.test(name)) {
			throw new Error(`Route name '${name}' contains invalid characters`);
		}

		this.name = name;
		this.path = path;
		this.routable = routable;
		this.defaults = normalizeRouteDefaults(paramDefaults ?? new Map());
	}

	public readonly name: string | null;
	public readonly path: string | null;
	public readonly routable: RoutableProvider | null;
	public readonly defaults: ReadonlyMap<string, RouteDefaultValue>;
}

/**
 * Root route is the root of routing tree. It is the only route that has no parent.
 */
export class RootRouteDeclaration extends RouteDeclaration {
	constructor(routable: RoutableProvider, children: (parent: RouteDeclaration) => RouteDeclaration[]) {
		super(null, null, null, routable);

		this.children = children(this);
	}

	public readonly children: RouteDeclaration[];
}

/**
 * Child route is a route with a parent.
 */
 export class ChildRouteDeclaration extends RouteDeclaration {
	constructor(name: string | null, path: string | null, defaults: RouteDefaults | null, routable: RoutableProvider | null, parent: RouteDeclaration) {
		super(name, path, defaults, routable);

		this.parent = parent;	
	}

	readonly parent: RouteDeclaration;
}

/**
 * Layout route is a branch in the route tree - it must contains at least one child route.
 */
export class LayoutRouteDeclaration extends ChildRouteDeclaration {
	constructor(name: string | null, path: string | null, defaults: RouteDefaults | null, routable: RoutableProvider | null, parent: RouteDeclaration, children: (parent: RouteDeclaration) => RouteDeclaration[]) {
		super(name, path, defaults, routable, parent);

		this.children = children(this);
	}

	public readonly children: RouteDeclaration[];
}

/**
 * Page route is a leaf in the route tree - it cannot branch any further.
 */
export class PageRouteDeclaration extends ChildRouteDeclaration {
	constructor(name: string, path: string | null, defaults: RouteDefaults | null, routable: RoutableProvider | null, parent: RouteDeclaration) {
		super(name, path, defaults, routable, parent);
	}
}
