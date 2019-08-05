import { Container as InversifyContainer } from 'inversify';
import { Newable } from '../tools';
import { Tag } from './tag';

export enum BindingScope {
	singleton = 1,
	transient = 2,
}

export const ContainerTag = new Tag<Container>('Stackino ioc container');

/**
 * Function key on objects being injected called after injection is finished.
 **/
export const Constructed = Symbol('Stackino ioc constructed callback');

/**
 * Container is stored in all injected objects under this key.
 */
export const ContainerKey = Symbol('Stackino container');

export interface Container {
	/**
	 * Bind `tag` to `impl` in `scope`.
	 * @param tag Tag of injectable.
	 * @param impl Implementation of injectable.
	 * @param scope Scope in which injectable is bound.
	 */
	bind<T>(tag: Tag<T>, impl: Newable<T>, scope?: BindingScope): void;

	/**
	 * Bind `tag` to `value`.
	 * @param tag Tag of injectable.
	 * @param value Value that will be injected to consumers.
	 */
	bindConstantValue<T>(tag: Tag<T>, value: T): void;

	/**
	 * Bind `tag` to `impl` in `scope` if injectable is not bound yet.
	 * @param tag Tag of injectable.
	 * @param impl Implementation of injectable.
	 * @param scope Scope in which injectable is bound.
	 */
	tryBind<T>(tag: Tag<T>, impl: Newable<T>, scope?: BindingScope): boolean;

	/**
	 * Get instance from registry.
	 * @param tag Tag of requested injectable.
	 */
	get<T>(tag: Tag<T>): T;

	/**
	 * Inject properties of given object.
	 * @param obj Object with injectable properties.
	 */
	inject<T>(obj: T): T;
}

export class DefaultContainer implements Container {
	constructor() {
		this.impl = new InversifyContainer();
	}

	private impl: InversifyContainer;

	/**
	 * Bind `tag` to `impl` in `scope`.
	 * @param tag Tag of injectable.
	 * @param impl Implementation of injectable.
	 * @param scope Scope in which injectable is bound.
	 */
	bind<T>(tag: Tag<T>, impl: Newable<T>, scope: BindingScope = BindingScope.singleton): void {
		const binding = this.impl.bind(tag.symbol).to(impl);
		//this.impl.resolve
		switch (scope) {
			case BindingScope.singleton:
				binding.inSingletonScope();
				break;

			case BindingScope.transient:
				binding.inTransientScope();
				break;

			default:
				throw new Error(`Undefined behavior for scope '${scope}'`);
		}
	}

	/**
	 * Bind `tag` to `value`.
	 * @param tag Tag of injectable.
	 * @param value Value that will be injected to consumers.
	 */
	bindConstantValue<T>(tag: Tag<T>, value: T): void {
		this.impl.bind(tag.symbol).toConstantValue(value);
	}

	/**
	 * Bind `tag` to `impl` in `scope` if injectable is not bound yet.
	 * @param tag Tag of injectable.
	 * @param impl Implementation of injectable.
	 * @param scope Scope in which injectable is bound.
	 */
	tryBind<T>(tag: Tag<T>, impl: Newable<T>, scope: BindingScope = BindingScope.singleton): boolean {
		if (this.impl.isBound(tag.symbol)) {
			return false;
		}

		this.bind(tag, impl, scope);
		return true;
	}

	/**
	 * Get instance from registry.
	 * @param tag Tag of requested injectable.
	 */
	get<T>(tag: Tag<T>): T {
		const result = this.impl.get<T>(tag.symbol);

		this.inject(result);

		return result;
	}

	/**
	 * Inject properties of given object.
	 * @param obj Object with injectable properties.
	 */
	inject<T>(obj: T): T {
		const injectProperties: (string | symbol)[] | undefined = Reflect.getMetadata('stackino:ioc:inject-properties', (obj as any).constructor);

		if (injectProperties) {
			for (const injectProperty of injectProperties) {
				if ((obj as any)[injectProperty] !== undefined) {
					continue;
				}

				const tag = Reflect.getMetadata('stackino:ioc:inject-from', obj, injectProperty);

				if (tag && tag.symbol) {
					const value = this.impl.get(tag.symbol);

					this.inject(value);

					(obj as any)[injectProperty] = value;
				} else {
					typeof console === 'object' && console !== null && typeof console.warn === 'function' &&
						console.warn(`Annotation 'stackino:ioc:inject-from' for property '${injectProperty.toString()}' has invalid tag '${tag}'`);
				}
			}
		}

		(obj as any)[ContainerKey] = this;

		const constructed = (obj as any)[Constructed];
		if (constructed && typeof constructed === 'function') {
			constructed.call(obj);
		}

		return obj;
	}
}
