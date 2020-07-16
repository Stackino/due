import 'jest';
import { Tag, Injectable, ServiceCollection } from '../../src';

// test classes
const Service1Tag = new Tag<Service1>();
class Service1 { }

const Service2Tag = new Tag<Service2>();
class Service2 { }

const Service3Tag = new Tag<Service3>();
class Service3 { }

const Service4Tag = new Tag<Service4>();
class Service4 { }

const ServiceWithDependency1Tag = new Tag<ServiceWithDependency1>();
class ServiceWithDependency1 extends Injectable {
	public service1 = this.$dependency(Service1Tag);
	public service2 = this.$dependency(Service2Tag);
	public service3 = this.$dependency(Service3Tag);
}

const ServiceWithInheritanceTag = new Tag<ServiceWithInheritance>();
class ServiceWithInheritance extends ServiceWithDependency1 {
	public service4 = this.$dependency(Service4Tag);
}

test('lifetime', async () => {
	const collection = new ServiceCollection();
	collection.bind(Service1Tag).toClass(Service1).inSingletonLifetime();
	collection.bind(Service2Tag).toClass(Service2).inScopeLifetime();
	collection.bind(Service3Tag).toClass(Service3).inTransientLifetime();

	const serviceProvider = collection.build();
	const service1 = serviceProvider.get(Service1Tag);
	const service2 = serviceProvider.get(Service2Tag);
	const service3 = serviceProvider.get(Service3Tag);

	expect(service1 instanceof Service1).toBe(true);
	expect(service2 instanceof Service2).toBe(true);
	expect(service3 instanceof Service3).toBe(true);
	expect(serviceProvider.get(Service1Tag)).toBe(service1);
	expect(serviceProvider.get(Service2Tag)).toBe(service2);
	expect(serviceProvider.get(Service3Tag)).not.toBe(service3);

	const serviceProvider2 = serviceProvider.createScope();
	expect(serviceProvider2.get(Service1Tag)).toBe(service1);
	expect(serviceProvider2.get(Service2Tag)).not.toBe(service2);
	expect(serviceProvider2.get(Service3Tag)).not.toBe(service3);
});

test('injectable service', async () => {
	const collection = new ServiceCollection();
	collection.bind(Service1Tag).toClass(Service1).inSingletonLifetime();
	collection.bind(Service2Tag).toClass(Service2).inScopeLifetime();
	collection.bind(Service3Tag).toClass(Service3).inTransientLifetime();
	collection.bind(ServiceWithDependency1Tag).toClass(ServiceWithDependency1).inTransientLifetime();

	const serviceProvider = collection.build();
	const service1 = serviceProvider.get(Service1Tag);
	const service2 = serviceProvider.get(Service2Tag);
	const service3 = serviceProvider.get(Service3Tag);
	const serviceWithDependency1 = serviceProvider.get(ServiceWithDependency1Tag);

	expect(serviceWithDependency1).toBeInstanceOf(ServiceWithDependency1);
	expect(serviceWithDependency1.service1).toBeInstanceOf(Service1);
	expect(serviceWithDependency1.service2).toBeInstanceOf(Service2);
	expect(serviceWithDependency1.service3).toBeInstanceOf(Service3);
	expect(serviceWithDependency1.service1).toBe(service1);
	expect(serviceWithDependency1.service2).toBe(service2);
	expect(serviceWithDependency1.service3).not.toBe(service3);

	const serviceProvider2 = serviceProvider.createScope();
	const serviceWithDependency2 = serviceProvider2.get(ServiceWithDependency1Tag);
	expect(serviceWithDependency1).not.toBe(serviceWithDependency2);
	expect(serviceWithDependency2).toBeInstanceOf(ServiceWithDependency1);
	expect(serviceWithDependency2.service1).toBeInstanceOf(Service1);
	expect(serviceWithDependency2.service2).toBeInstanceOf(Service2);
	expect(serviceWithDependency2.service3).toBeInstanceOf(Service3);
	expect(serviceWithDependency2.service1).toBe(service1);
	expect(serviceWithDependency2.service2).not.toBe(service2);
	expect(serviceWithDependency2.service3).not.toBe(service3);
});

test('inject unbound service', async () => {
	const collection = new ServiceCollection();
	collection.bind(Service1Tag).toClass(Service1).inSingletonLifetime();
	collection.bind(Service2Tag).toClass(Service2).inScopeLifetime();
	collection.bind(Service3Tag).toClass(Service3).inTransientLifetime();
	collection.bind(Service4Tag).toClass(Service4).inTransientLifetime();

	const serviceProvider = collection.build();
	const service1 = serviceProvider.get(Service1Tag);
	const service2 = serviceProvider.get(Service2Tag);
	const service3 = serviceProvider.get(Service3Tag);
	const service4 = serviceProvider.get(Service4Tag);

	const serviceWithInheritance = serviceProvider.createFromClass(ServiceWithInheritance);

	expect(serviceWithInheritance).toBeInstanceOf(ServiceWithDependency1);
	expect(serviceWithInheritance.service1).toBeInstanceOf(Service1);
	expect(serviceWithInheritance.service2).toBeInstanceOf(Service2);
	expect(serviceWithInheritance.service3).toBeInstanceOf(Service3);
	expect(serviceWithInheritance.service4).toBeInstanceOf(Service4);
	expect(serviceWithInheritance.service1).toBe(service1);
	expect(serviceWithInheritance.service2).toBe(service2);
	expect(serviceWithInheritance.service3).not.toBe(service3);
	expect(serviceWithInheritance.service4).not.toBe(service4);
});

test('ctor is executed after injection', async () => {
	class TestService extends Injectable {
		public service1 = this.$dependency(Service1Tag);
		public service2 = this.$dependency(Service2Tag);

		constructor() {
			super();

			expect(this.service1).toBeInstanceOf(Service1);
			expect(this.service2).toBeInstanceOf(Service2);
		}
	}

	class ChildTestService extends TestService {
		public service3 = this.$dependency(Service3Tag);
		public service4 = this.$dependency(Service4Tag);

		constructor() {
			super();

			expect(this.service1).toBeInstanceOf(Service1);
			expect(this.service2).toBeInstanceOf(Service2);
			expect(this.service3).toBeInstanceOf(Service3);
			expect(this.service4).toBeInstanceOf(Service4);
		}
	}

	const collection = new ServiceCollection();
	collection.bind(Service1Tag).toClass(Service1).inSingletonLifetime();
	collection.bind(Service2Tag).toClass(Service2).inScopeLifetime();
	collection.bind(Service3Tag).toClass(Service3).inTransientLifetime();
	collection.bind(Service4Tag).toClass(Service4).inTransientLifetime();

	const serviceProvider = collection.build();

	const testService = serviceProvider.createFromClass(TestService);
	expect(testService).toBeInstanceOf(TestService);

	const childTestService = serviceProvider.createFromClass(ChildTestService);
	expect(childTestService).toBeInstanceOf(TestService);
	expect(childTestService).toBeInstanceOf(ChildTestService);
});
