import { injectable as InversifyInjectable } from 'inversify';
import { Tag } from './tag';
import { getCurrentContainer, Container } from './container';

// TODO: this could use some type checking once decorators are properly specced

export function injectable(tag: Tag<any>): (target: any) => any {
	return (target: any) => {
		let tags = Reflect.getMetadata('stackino:ioc:injectable-as', target) as Tag<unknown>[];
		if (!tags) {
			tags = [];
		}
		tags.push(tag);

		Reflect.defineMetadata('stackino:ioc:injectable-as', tags, target);

		return InversifyInjectable()(target);
	};
}

export abstract class Injectable {
	constructor() {
		const container = getCurrentContainer();
		if (!container) {
			throw new Error('Injectable can be instantiated only using `Container.instantiate`');
		}

		this.$container = container;
	}

	protected $container: Container;

	protected $dependency<TService>(tag: Tag<TService>): TService {
		return this.$container.get(tag);
	}
}