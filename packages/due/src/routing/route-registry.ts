import { Tag } from '../ioc';
import { buildRoute, Route } from './route';
import { RootRouteDeclaration, RouteDeclaration } from './route-declaration';

export const RouteRegistryTag = new Tag<RouteRegistry>('Stackino route registry');

export interface RouteRegistry {
	readonly root: Route;
	readonly routesByDeclaration: ReadonlyMap<RouteDeclaration, Route>;
	readonly routesById: ReadonlyMap<string, Route>;
	readonly routesByName: ReadonlyMap<string, Route>;

	start(route: RootRouteDeclaration): Promise<void>;

	getByDeclaration(declaration: RouteDeclaration): Route;
	getById(id: string): Route;
	getByName(name: string): Route;

	stop(): Promise<void>;
}

export class DefaultRouteRegistry implements RouteRegistry {

	private _root: Route | null = null;
	get root(): Route {
		if (!this._root) {
			throw new Error('Route registry is not started');
		}

		return this._root;
	}

	private _routesByDeclaration: Map<RouteDeclaration, Route> | null = null;
	get routesByDeclaration(): ReadonlyMap<RouteDeclaration, Route> {
		if (!this._routesByDeclaration) {
			throw new Error('Route registry is not started');
		}

		return this._routesByDeclaration;
	}

	private _routesById: Map<string, Route> | null = null;
	get routesById(): ReadonlyMap<string, Route> {
		if (!this._routesById) {
			throw new Error('Route registry is not started');
		}

		return this._routesById;
	}

	private _routesByName: Map<string, Route> | null = null;
	get routesByName(): ReadonlyMap<string, Route> {
		if (!this._routesByName) {
			throw new Error('Route registry is not started');
		}

		return this._routesByName;
	}

	private index(route: Route): void {
		if (this._routesByDeclaration!.has(route.declaration)) {
			throw new Error(`Route is already registered`);
		}
		this._routesByDeclaration!.set(route.declaration, route);

		if (this._routesById!.has(route.id)) {
			throw new Error(`Route id:'${route.id}' is already registered`);
		}
		this._routesById!.set(route.id, route);

		if (route.name) {
			if (this._routesByName!.has(route.name)) {
				throw new Error(`Route name:'${route.name}' is already registered`);
			}

			this._routesByName!.set(route.name, route);
		}

		for (const child of route.children) {
			this.index(child);
		}
	}

	async start(rootRoute: RootRouteDeclaration): Promise<void> {
		this._root = await buildRoute(rootRoute, rootRoute.name || '$<root>');

		this._routesByDeclaration = new Map();
		this._routesById = new Map();
		this._routesByName = new Map();
		this.index(this._root);
	}

	getByDeclaration(declaration: RouteDeclaration): Route {
		const result = this.routesByDeclaration.get(declaration);
		if (!result) {
			throw new Error('Route not found');
		}

		return result;
	}

	getById(id: string): Route {
		const result = this.routesById.get(id);
		if (!result) {
			throw new Error(`Route '${id}' not found`);
		}

		return result;
	}

	getByName(name: string): Route {
		const result = this.routesByName.get(name);
		if (!result) {
			throw new Error(`Route '${name}' not found`);
		}

		return result;
	}

	stop(): Promise<void> {
		this._routesByName = null;
		this._routesById = null;
		this._routesByDeclaration = null;
		this._root = null;

		return Promise.resolve();
	}
}
