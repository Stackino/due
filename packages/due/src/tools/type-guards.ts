/* eslint-disable @typescript-eslint/ban-types */

/**
 * Verify value is an object. `T` describes object type, however it is not checked whether it actually matches.
 * @param value Value to be checked.
 */
export function isObject<T extends object>(value: unknown): value is T {
	return typeof value === 'object' && value !== null;
}

/**
 * Verify value is an object or null. `T` describes object type, however it is not checked whether it actually matches.
 * @param value Value to be checked.
 */
export function isObjectOrNull<T extends object>(value: unknown): value is T | null {
	return isObject<T>(value) || value === null;
}

/**
 * Verify value is a string.
 * @param value Value to be checked.
 */
export function isString(value: unknown): value is string {
	return typeof value === 'string';
}

/**
 * Verify value is a string or null.
 * @param value Value to be checked.
 */
export function isStringOrNull(value: unknown): value is string | null {
	return typeof value === 'string' || value === null;
}

/**
 * Verify value is a function. `T` describes function signature, however it is not checked whether it actually matches.
 * @param value Value to be checked.
 */
export function isFunction<T extends Function>(value: unknown): value is T {
	return typeof value === 'function';
}

/**
 * Verify value is a function or null. `T` describes function signature, however it is not checked whether it actually matches.
 * @param value Value to be checked.
 */
export function isFunctionOrNull<T extends Function>(value: unknown): value is T | null {
	return isFunction<T>(value) || value === null;
}