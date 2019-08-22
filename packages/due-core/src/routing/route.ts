import { executeProvider, pathCombine, Provider } from '../tools';
import { RouteDeclaration, LayoutRouteDeclaration, RootRouteDeclaration } from './route-declaration';
import { Path } from 'path-parser';

export class Route {
	constructor(
		readonly declaration: RouteDeclaration,
		readonly id: string,
		readonly name: string | null,
		readonly path: string | null,
		readonly params: string[],
		readonly fullPath: string | null,
		readonly fullParams: string[],
		readonly parent: Route | null,
		readonly children: readonly Route[]
	) {
	}

	private _parents: readonly Route[] | null = null;
	public get parents(): readonly Route[] {
		if (this._parents) {
			return this._parents;
		}

		const parents: Route[] = [];

		let parent = this.parent;
		while (parent) {
			parents.push(parent);

			parent = parent.parent;
		}

		this._descendants = parents;

		return parents;
	}

	private _descendants: readonly Route[] | null = null;
	public get descendants(): readonly Route[] {
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

	/**
	 * Determines whether route `a` equals to route `b`.
	 * @param a Route `a`
	 * @param aParams Params for route `a`.
	 * @param b Route `b`
	 * @param bParams Params for route `b`. If omited params are not compared.
	 */
	static equals(a: Route, aParams: ReadonlyMap<string, string>, b: Route, bParams?: ReadonlyMap<string, string>): boolean {
		// constructed routes shouldn't have copies
		if (a !== b) {
			return false;
		}
	
		if (bParams) {
			for (const paramName of a.fullParams) {
				if (aParams.get(paramName) !== bParams.get(paramName)) {
					return false;
				}
			}
		}
	
		return true;
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

function buildRouteParams(route: RouteDeclaration): string[] {
	if (!route.path) {
		return [];
	}

	const path = Path.createPath(route.path);
	
	return path.params;
}

function buildRouteFullParams(route: RouteDeclaration, parent: Route | null): string[] {
	let result: string[] = [];

	if (parent) {
		result = result.concat(parent.fullParams);
	}
	result = result.concat(buildRouteParams(route));

	return result;
}

/* eslint-disable @typescript-eslint/no-use-before-define */
export async function buildRoute(declaration: RouteDeclaration, id: string, parent: Route | null = null): Promise<Route> {
	const uid = parent ? `${parent.id}.${id}` : id;
	const name = buildRouteName(declaration, parent);
	const path = buildRoutePath(declaration);
	const params = buildRouteParams(declaration);
	const fullPath = buildFullRoutePath(declaration, parent);
	const fullParams = buildRouteFullParams(declaration, parent);
	const children: Route[] = [];
	const route = new Route(declaration, uid, name, path, params, fullPath, fullParams, parent, children);

	if (declaration instanceof RootRouteDeclaration || declaration instanceof LayoutRouteDeclaration) {
		const childRoutes = await buildRoutes(declaration.children, route);

		children.push(...childRoutes);
	}

	return route;
}
/* eslint-enable @typescript-eslint/no-use-before-define */

export async function buildRoutes(declarations: RouteDeclaration[], parent: Route | null = null): Promise<Route[]> {
	const result: Route[] = [];

	let index = 0;
	for (const declaration of declarations) {
		const route = await buildRoute(declaration, declaration.name || `$<child_${index}>`, parent);

		result.push(route);
		index++;
	}

	return result;
}
