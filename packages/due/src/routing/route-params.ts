import { isObjectOrNull } from '../tools';
import { Transition } from './transition';

export const Inherit = Symbol('kebab');
export type RouteDefaultValue = string | typeof Inherit;

export type RouteParams = { readonly [key: string]: string } | ReadonlyMap<string, string>;
export type RouteDefaults = { readonly [key: string]: RouteDefaultValue } | ReadonlyMap<string, RouteDefaultValue>;
// TODO: this should be serializable
export type RouteData = { readonly [key: string]: string } | ReadonlyMap<string | symbol, unknown>;

export function normalizeRouteParams(params: RouteParams): Map<string, string> {
	if (params instanceof Map) {
		return params;
	}
	
	const result = new Map<string, string>();

	for (const [k, v] of Object.entries(params)) {
		result.set(k, v);
	}

	return result;
}
export function normalizeOptionalRouteParams(params?: RouteParams): Map<string, string> | undefined {
	if (!params) {
		return undefined;
	}

	return normalizeRouteParams(params);
}

export function normalizeRouteData(data: RouteData): Map<string | symbol, unknown> {
	if (data instanceof Map) {
		return data;
	}

	const result = new Map<string, string>();

	for (const [k, v] of Object.entries(data)) {
		result.set(k, v);
	}

	return result;
}
export function normalizeOptionalRouteData(data?: RouteData): Map<string | symbol, unknown> | undefined {
	if (!data) {
		return undefined;
	}

	return normalizeRouteData(data);
}

export function normalizeRouteDefaults(defaults: RouteDefaults): Map<string, RouteDefaultValue> {
	if (defaults instanceof Map) {
		return defaults;
	}
	
	const result = new Map<string, RouteDefaultValue>();

	for (const [k, v] of Object.entries(defaults)) {
		result.set(k, v);
	}

	return result;
}
export function normalizeOptionalRouteDefaults(defaults?: RouteDefaults): Map<string, RouteDefaultValue> | undefined {
	if (!defaults) {
		return undefined;
	}

	return normalizeRouteDefaults(defaults);
}

/**
 * Verify value is a string or null.
 * @param value Value to be checked.
 */
export function isRouteDefaultsOrNull(value: unknown): value is RouteDefaults | null {
	return isObjectOrNull<{ readonly [key: string]: RouteDefaultValue }>(value) || value instanceof Map;
}

export function applyRouteDefaults(from: Transition | null, params: Map<string, string>, defaults: ReadonlyMap<string, RouteDefaultValue>): void {

	for (const [key, value] of defaults) {
		if (params.has(key)) {
			continue;
		}

		if (value === Inherit) {
			const inheritedValue = from?.toParams.get(key);
			if (inheritedValue === undefined || inheritedValue === null) {
				throw new Error(`Cannot inherit route param '${key}' as it is not present in previous params`);
			}

			params.set(key, inheritedValue);
		} else {
			params.set(key, value);
		}
	}

}