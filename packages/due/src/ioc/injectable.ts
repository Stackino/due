import { injectable as InversifyInjectable } from 'inversify';
import { Tag } from './tag';

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
