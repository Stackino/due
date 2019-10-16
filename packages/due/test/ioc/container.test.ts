import 'jest';
import 'reflect-metadata';
import { injectable, Tag, inject, DefaultContainer, BindingScope, Injectable } from '../../src';

const Dependency1Tag = new Tag<Dependency1>('Test dependency 1');

@injectable(Dependency1Tag)
class Dependency1 {}

const Dependency2Tag = new Tag<Dependency2>('Test dependency 2');

@injectable(Dependency2Tag)
class Dependency2 {}

class ConsumerBase {
    @inject(Dependency1Tag)
    public dependency1!: Dependency1;
}

class Consumer extends ConsumerBase {
    @inject(Dependency2Tag)
    public dependency2!: Dependency2;
}

class ObjectConsumerBase extends Injectable {
    public dependency1 = this.$dependency(Dependency1Tag);
}

class ObjectConsumer extends Injectable {
    public dependency2 = this.$dependency(Dependency2Tag);
}

test('decorators: resolves class hierarchy', async () => {
    const container = new DefaultContainer();
    container.bind(Dependency1Tag, Dependency1, BindingScope.singleton);
    container.bind(Dependency2Tag, Dependency2, BindingScope.singleton);

    const consumer = new Consumer();
    container.inject(consumer);

    expect(consumer.dependency1 instanceof Dependency1).toBe(true);
    expect(consumer.dependency2 instanceof Dependency2).toBe(true);
});

test('base object: resolves class hierarchy', async () => {
    const container = new DefaultContainer();
    container.bind(Dependency1Tag, Dependency1, BindingScope.singleton);
    container.bind(Dependency2Tag, Dependency2, BindingScope.singleton);

    const consumer = container.instantiate(Consumer);

    expect(consumer.dependency1 instanceof Dependency1).toBe(true);
    expect(consumer.dependency2 instanceof Dependency2).toBe(true);
});
