import 'jest';
import 'reflect-metadata';
import { injectable, Tag, inject, DefaultContainer, BindingScope } from '../../src';

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

test('resolves class hierarchy', async () => {
    const container = new DefaultContainer();
    container.bind(Dependency1Tag, Dependency1, BindingScope.singleton);
    container.bind(Dependency2Tag, Dependency2, BindingScope.singleton);

    const a = Reflect.getMetadata('stackino:ioc:inject-properties', Consumer);

    const consumer = new Consumer();

    const b = Reflect.getMetadata('stackino:ioc:inject-properties', consumer);

    container.inject(consumer);

    expect(consumer.dependency1 instanceof Dependency1).toBe(true);
    expect(consumer.dependency2 instanceof Dependency2).toBe(true);
});
