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
	 * Single instance for service provider where it was registered and all it's children.
	 */
	singleton = 2,
	/**
	 * Single instance for each service provider.
	 */
	scope = 3,
}

/**
 * Determines whether descriptor should be considered for resolution.
 */
export enum ServiceDescriptorStatus {
	configuring = 1,
	bound = 2,
	unbound = 3,
}

export interface BindingInSyntax<T> {
	/**
	 * Declare service as transient. Every request will receive new instance.
	 */
	inTransientLifetime(): void;
	/**
	 * Declare service as singleton. Every request will receive same instance within same service provider and all its children.
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
	public status: ServiceDescriptorStatus = ServiceDescriptorStatus.configuring;
	public lifetime: ServiceLifetime = ServiceLifetime.singleton;
	public provider: ((serviceProvider: ServiceProvider) => T) | null = null;
	
	toValue(value: T): BindingInSyntax<T> {
		this.provider = () => value;
		this.status = ServiceDescriptorStatus.bound;
		return this;
	}
	toClass(ctor: Newable<T>): BindingInSyntax<T> {
		this.provider = () => new ctor();
		this.status = ServiceDescriptorStatus.bound;
		return this;
	}
	toFactory(factory: (serviceProvider: ServiceProvider) => T): BindingInSyntax<T> {
		this.provider = factory;
		this.status = ServiceDescriptorStatus.bound;
		return this;
	}

	inTransientLifetime(): void {
		this.lifetime = ServiceLifetime.transient;
	}
	inSingletonLifetime(): void {
		this.lifetime = ServiceLifetime.singleton;
	}
	inScopeLifetime(): void {
		this.lifetime = ServiceLifetime.scope;
	}

	/**
	 * Mark descriptor as unbound and reset it's lifetime and provider.
	 */
	unbind() {
		this.status = ServiceDescriptorStatus.unbound;
		this.lifetime = ServiceLifetime.singleton;
		this.provider = null;
	}

	/**
	 * Create a clone of this service descriptor.
	 * @returns Clone of this service descriptor.
	 */
	clone() {
		const clone = new ServiceDescriptor(this.tag);
		clone.lifetime = this.lifetime;
		clone.provider = this.provider;
		clone.status = this.status;
		return clone;
	}
}

export const ServiceProviderTag = new Tag<ServiceProvider>("Service provider");

/**
 * Allow retrieval and management of services. Supposed to be instantiated using `ServiceCollection`.
 */
export class ServiceProvider {
	constructor(descriptors: Map<Tag<unknown>, ServiceDescriptor<unknown>>, parent?: ServiceProvider) {
		this.descriptors = descriptors;
		this.parent = parent;
	}

	private descriptors: Map<Tag<unknown>, ServiceDescriptor<unknown>>;
	private singletonCache: Map<Tag<unknown>, unknown> = new Map();
	private scopeCache: Map<Tag<unknown>, unknown> = new Map();
	private parent?: ServiceProvider;

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

	private getImpl<T>(tag: Tag<T>, parentMode: boolean): T {
		// when asking for service provider, return itself - this cannot be reconfigured
		if (tag === ServiceProviderTag) {
			return this as unknown as T;
		}

		const descriptor = this.descriptors.get(tag);
		if (!descriptor) {
			// if we have parent, try using it when we don't have own descriptor available
			if (this.parent) {
				// at this point the service should be either singleton from parent
				// or not bound at all since we hold all other parents descriptors as well
				return this.parent.getImpl(tag, true);
			}

			throw new Error(`Binding for service '${tag.symbol.toString()}' not found`);
		}

		if (descriptor.status === ServiceDescriptorStatus.configuring) {
			throw new Error(`Binding for service '${tag.symbol.toString()}' is misconfigured, missing toValue, toClass or toFactory call?`);
		}
		if (descriptor.status === ServiceDescriptorStatus.unbound) {
			throw new Error(`Binding for service '${tag.symbol.toString()}' was unbound`);
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
			if (parentMode) {
				throw new Error(`Binding for service '${tag.symbol.toString()}' found in parent provider with scope lifetime. This is likely a bug, please report it.`);
			}

			if (this.scopeCache.has(tag)) {
				value = this.scopeCache.get(tag);
			} else {
				value = this.createFromDescriptor(descriptor);
				this.scopeCache.set(tag, value);
			}
		} else if (descriptor.lifetime === ServiceLifetime.transient) {
			if (parentMode) {
				throw new Error(`Binding for service '${tag.symbol.toString()}' found in parent provider with transient lifetime. This is likely a bug, please report it.`);
			}

			value = this.createFromDescriptor(descriptor);
		} else {
			throw new Error(`Invalid service lifetime '${descriptor.lifetime}'`);
		}

		return value as T;
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
	createScope(options?: { configure?: (services: ServiceCollection) => void }): ServiceProvider {
		const descriptors = new Map<Tag<unknown>, ServiceDescriptor<unknown>>();

		// filter out singleton descriptors as those will be requiested by parent instance
		// filter out descriptors that are not bound as those aren't relevant to anything
		for (const [tag, descriptor] of this.descriptors) {
			if (descriptor.lifetime === ServiceLifetime.singleton || descriptor.status !== ServiceDescriptorStatus.bound) {
				continue;
			}

			// clone descriptors as they may be reconfigured
			descriptors.set(tag, descriptor.clone());
		}

		// create and configure new collection
		const services = new ServiceCollection(descriptors, this);

		if (options?.configure) {
			options.configure(services);
		}

		return services.build();
	}

	/**
	 * Get service by tag.
	 * @param tag Service tag.
	 */
	get<T>(tag: Tag<T>): T {
		return this.getImpl(tag, false);
	}
}

/**
 * Class to configure a service provider.
 */
export class ServiceCollection {
	constructor();
	constructor(descriptors: Map<Tag<unknown>, ServiceDescriptor<unknown>>, parent: ServiceProvider);
	constructor(descriptors?: Map<Tag<unknown>, ServiceDescriptor<unknown>>, parent?: ServiceProvider) {
		this.descriptors = descriptors ?? new Map();
		this.parent = parent
	}

	private descriptors: Map<Tag<unknown>, ServiceDescriptor<unknown>>;
	private parent?: ServiceProvider;

	/**
	 * Return whether there is already a service bound to given tag or not.
	 * @param tag Service tag.
	 */
	isBound<T>(tag: Tag<T>): boolean {
		const descriptor = this.descriptors.get(tag);

		return descriptor?.status === ServiceDescriptorStatus.bound;
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
	 * Attempt to create binding for given tag. If binding already exists, further configuration will have no effect.
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
	 * Remove binding for given tag. If used in child collection this will block attempts at resolving the service from parent.
	 * @param tag Service tag.
	 */
	unbind<T>(tag: Tag<T>): void {
		let descriptor = this.descriptors.get(tag);
		if (!descriptor) {
			descriptor = new ServiceDescriptor(tag);
			this.descriptors.set(tag, descriptor);
		}

		descriptor.unbind();
	}

	/**
	 * Create new service provider using configured descriptors.
	 */
	build(): ServiceProvider {
		return new ServiceProvider(new Map(this.descriptors), this.parent);
	}
}
