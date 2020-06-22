import { Newable } from '../tools';

let currentServiceProvider: ServiceProvider | null = null;

function getCurrentServiceProvider(): ServiceProvider {
	if (currentServiceProvider === null) {
		throw new Error('Cannot execute outside of dependency injection context.');
	}

	return currentServiceProvider;
}

function executeWithCurrentServiceProvider(serviceProvider: ServiceProvider, action: () => void): void {
	const prevServiceProvider = currentServiceProvider;
	try {
		currentServiceProvider = serviceProvider;
		action();
	} finally {
		currentServiceProvider = prevServiceProvider;
	}
}

/**
 * Base class for services being injected.
 */
export class Injectable {
	constructor() {
		this.$serviceProvider = getCurrentServiceProvider();
	}

	/**
	 * Service provider to which current instance is bound.
	 */
	protected $serviceProvider: ServiceProvider;

	/**
	 * Declare dependency on given tag. Recommended use is within field initializers.
	 * @param tag Service tag.
	 */
	protected $dependency<TService>(tag: Tag<TService>): TService {
		return this.$serviceProvider.get(tag);
	}
}

/**
 * Unique identifier for your services. Type parameter is there purely for typing convenience - you can have multiple tags for the same type.
 */
export class Tag<T> {
	constructor(description: string = 'anonymous service') {
		this.symbol = Symbol(`Tag: ${description}`);
	}

	public readonly symbol: symbol;
}

/**
 * Determines how service instances are treated within mutliple requests.
 */
export enum ServiceLifetime {
	/**
	 * New instance for every get.
	 */
	transient = 1,
	/**
	 * Single instance for root service provider and all it's children.
	 */
	singleton = 2,
	/**
	 * Single instance for each service provider.
	 */
	scope = 3,
}

export interface BindingInSyntax<T> {
	/**
	 * Declare service as transient. Every request will receive new instance.
	 */
	inTransientLifetime(): void;
	/**
	 * Declare service as singleton. Every request will receive same instance.
	 */
	inSingletonLifetime(): void;
	/**
	 * Declare service as scoped. Every request will receive same instance within same service provider.
	 */
	inScopeLifetime(): void;
}

export interface BindingToSyntax<T> {
	/**
	 * Bind given tag to constant value.
	 * @param value Constant value.
	 */
	toValue(value: T): BindingInSyntax<T>;
	/**
	 * Bind given tag to a class which will be instantiated upon requests.
	 * @param ctor Class constructor.
	 */
	toClass(ctor: Newable<T>): BindingInSyntax<T>;
	/**
	 * Bind given tag to a service factory which will be called upon requests.
	 * @param factory Service factory.
	 */
	toFactory(factory: (serviceProvider: ServiceProvider) => T): BindingInSyntax<T>;
}

export class ServiceDescriptor<T> implements BindingInSyntax<T>, BindingToSyntax<T> {
	constructor(tag: Tag<T>) {
		this.tag = tag;
	}

	public tag: Tag<T>;
	public lifetime: ServiceLifetime = ServiceLifetime.transient;
	public provider: ((serviceProvider: ServiceProvider) => T) | null = null;
	
	inTransientLifetime(): void {
		this.lifetime = ServiceLifetime.transient;
	}
	inSingletonLifetime(): void {
		this.lifetime = ServiceLifetime.singleton;
	}
	inScopeLifetime(): void {
		this.lifetime = ServiceLifetime.scope;
	}

	toValue(value: T): BindingInSyntax<T> {
		this.provider = () => value;
		return this;
	}
	toClass(ctor: Newable<T>): BindingInSyntax<T> {
		this.provider = () => new ctor();
		return this;
	}
	toFactory(factory: (serviceProvider: ServiceProvider) => T): BindingInSyntax<T> {
		this.provider = factory;
		return this;
	}
}

export const ServiceProviderTag = new Tag<ServiceProvider>("Service provider");

/**
 * Allow retrieval and management of services. Supposed to be instantiated using `ServiceCollection`.
 */
export class ServiceProvider {
	constructor(descriptors: Map<Tag<unknown>, ServiceDescriptor<unknown>>, singletonCache?: Map<Tag<unknown>, unknown>) {
		this.descriptors = descriptors;
		this.singletonCache = singletonCache ?? new Map();
	}

	private descriptors: Map<Tag<unknown>, ServiceDescriptor<unknown>>;
	private singletonCache: Map<Tag<unknown>, unknown>;
	private scopeCache: Map<Tag<unknown>, unknown> = new Map();

	private createFromDescriptor<T>(descriptor: ServiceDescriptor<T>): T {
		if (!descriptor) {
			throw new Error(`'createFromDescriptor' requires 'descriptor' parameter`);
		}
		if (!descriptor.provider) {
			throw new Error(`Descriptor for service '${descriptor.tag.symbol.toString()}' is misconfigured, missing toValue, toClass or toFactory call?`);
		}

		let value: T;

		executeWithCurrentServiceProvider(this, () => {
			value = descriptor.provider!(this);
		});

		return value!;
	}

	/**
	 * Retrieve new value from given factory within dependency injection context.
	 * @param factory Service factory.
	 */
	createFromFactory<T>(factory: (serviceProvider: ServiceProvider) => T): T {
		if (!factory) {
			throw new Error(`'createFromFactory' requires 'factory' parameter`);
		}
		let value: T;

		executeWithCurrentServiceProvider(this, () => {
			value = factory(this);
		});

		return value!;
	}

	/**
	 * Instantiate new instance of given class within dependency injection context.
	 * @param ctor Class constructor.
	 */
	createFromClass<T, TParams extends unknown[]>(ctor: new (...args: TParams) => T, ...args: TParams): T {
		if (!ctor) {
			throw new Error(`'createFromClass' requires 'ctor' parameter`);
		}
		let value: T;

		executeWithCurrentServiceProvider(this, () => {
			value = new ctor(...args);
		});

		return value!;
	}

	/**
	 * Create child service provider. All scoped servies will return new values when retrieved from this service provider.
	 */
	createScope(): ServiceProvider {
		return new ServiceProvider(this.descriptors, this.singletonCache);
	}

	/**
	 * Get service by tag.
	 * @param tag Service tag.
	 */
	get<T>(tag: Tag<T>): T {
		const descriptor = this.descriptors.get(tag);
		if (!descriptor) {
			if (tag === ServiceProviderTag) {
				return this as unknown as T;
			}

			throw new Error(`Missing binding for service '${tag.symbol.toString()}'`);
		}

		let value: unknown;
		if (descriptor.lifetime === ServiceLifetime.singleton) {
			if (this.singletonCache.has(tag)) {
				value = this.singletonCache.get(tag);
			} else {
				value = this.createFromDescriptor(descriptor);
				this.singletonCache.set(tag, value);
			}
		} else if (descriptor.lifetime === ServiceLifetime.scope) {
			if (this.scopeCache.has(tag)) {
				value = this.scopeCache.get(tag);
			} else {
				value = this.createFromDescriptor(descriptor);
				this.scopeCache.set(tag, value);
			}
		} else if (descriptor.lifetime === ServiceLifetime.transient) {
			value = this.createFromDescriptor(descriptor);
		} else {
			throw new Error(`Invalid service lifetime '${descriptor.lifetime}'`);
		}

		return value as T;
	}
}

/**
 * Class to configure a service provider.
 */
export class ServiceCollection {	
	private descriptors: Map<Tag<unknown>, ServiceDescriptor<unknown>> = new Map();

	/**
	 * Return whether there is already a service bound to given tag or not.
	 * @param tag Service tag.
	 */
	isBound<T>(tag: Tag<T>): boolean {
		return this.descriptors.has(tag);
	}

	/**
	 * Attempt to create binding for given tag. If binding already exists, it will be returned to be reconfigured.
	 * @param tag Service tag.
	 */
	bind<T>(tag: Tag<T>): BindingToSyntax<T> {
		let descriptor = this.descriptors.get(tag);
		if (!descriptor) {
			descriptor = new ServiceDescriptor(tag);
			this.descriptors.set(tag, descriptor);
		}
		return descriptor;
	}

	/**
	 * Attempt to create binding for given tag. If binding already exists, following calls will have no effect.
	 * @param tag Service tag.
	 */
	tryBind<T>(tag: Tag<T>): BindingToSyntax<T> {
		const descriptor = new ServiceDescriptor(tag);
		if (!this.descriptors.has(tag)) {
			this.descriptors.set(tag, descriptor);
		}
		return descriptor;
	}

	/**
	 * Remove binding for given tag if it exits.
	 * @param tag Service tag.
	 */
	unbind<T>(tag: Tag<T>): boolean {
		return this.descriptors.delete(tag);
	}

	/**
	 * Create new service provider using configured descriptors.
	 */
	build(): ServiceProvider {
		return new ServiceProvider(new Map(this.descriptors));
	}
}
