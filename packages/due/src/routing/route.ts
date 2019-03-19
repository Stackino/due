import { executeProvider, pathCombine, Provider } from '../tools';
import { RouteDeclaration, LayoutRouteDeclaration, RootRouteDeclaration } from './route-declaration';

export class Route {
	constructor(
		readonly declaration: RouteDeclaration,
		readonly id: string,
		readonly name: string | null,
		readonly path: string | null,
		readonly fullPath: string | null,
		readonly parent: Route | null,
		readonly children: ReadonlyArray<Route>
	) {
	}

	private _descendants: ReadonlyArray<Route> | null = null;
	public get descendants(): ReadonlyArray<Route> {
		if (this._descendants) {
			return this._descendants;
		}

		const descendants: Route[] = [];

		for (const child of this.children) {
			descendants.push(child);

			for (const descendant of child.descendants) {
				descendants.push(descendant);
			}
		}

		this._descendants = descendants;

		return descendants;
	}
}

function normalizeRoutePath(path: string): string {
	// normalize
	while (path.startsWith('/')) {
		path = path.substr(1);
	}
	while (path.endsWith('/')) {
		path = path.substr(0, path.length - 1);
	}

	return `/${path}`;
}

function buildRouteName(route: RouteDeclaration, parent: Route | null): string | null {
	if (!route.name) {
		return null;
	}

	let result = route.name;

	while (parent) {
		if (!parent.name) {
			parent = parent.parent;
			continue;
		}

		result = `${parent.name}.${result}`;
		break;
	}

	return result;
}

/**
 * Build relative path from given route parent route.
 */
function buildRoutePath(route: RouteDeclaration): string | null {
	if (!route.path) {
		return null;
	}

	return normalizeRoutePath(route.path);
}

/**
 * Build full path of given route.
 */
function buildFullRoutePath(route: RouteDeclaration, parent: Route | null): string | null {
	if (!route.path) {
		return null;
	}

	let result = route.path;

	while (parent) {
		if (!parent.fullPath) {
			parent = parent.parent;
			continue;
		}

		result = pathCombine('/', parent.fullPath, result);
		break;
	}

	// normalize
	while (result.endsWith('/')) {
		result = result.substr(0, result.length - 1);
	}
	while (result.startsWith('/')) {
		result = result.substr(1);
	}

	return normalizeRoutePath(result);
}

/* eslint-disable @typescript-eslint/no-use-before-define */
export async function buildRoute(declaration: RouteDeclaration, id: string, parent: Route | null = null): Promise<Route> {
	const uid = parent ? `${parent.id}.${id}` : id;
	const name = buildRouteName(declaration, parent);
	const path = buildRoutePath(declaration);
	const fullPath = buildFullRoutePath(declaration, parent);
	const children: Route[] = [];
	const route = new Route(declaration, uid, name, path, fullPath, parent, children);

	if (declaration instanceof RootRouteDeclaration || declaration instanceof LayoutRouteDeclaration) {
		const childRoutes = await buildRoutes(declaration.children, route);

		children.push.apply(children, childRoutes);
	}

	return route;
}
/* eslint-enable @typescript-eslint/no-use-before-define */

export async function buildRoutes(provider: Provider<RouteDeclaration[]>, parent: Route | null = null): Promise<Route[]> {
	const declarations = await executeProvider(provider);

	const result: Route[] = [];

	let index = 0;
	for (const declaration of declarations) {
		const route = await buildRoute(declaration, declaration.name || `$<child_${index}>`, parent);

		result.push(route);
		index++;
	}

	return result;
}
