import { Tag } from './tag';

/* eslint-disable @typescript-eslint/ban-types */
export function inject<T>(tag: Tag<T>): (target: Object, propertyKey: string | symbol) => void {
	return (target: Object, propertyKey: string | symbol) => {
		let properties: (string | symbol)[] | undefined = Reflect.getMetadata('stackino:ioc:inject-properties', target);
		if (!properties) {
			Reflect.defineMetadata('stackino:ioc:inject-properties', properties = [], target);
		}
		properties.push(propertyKey);

		Reflect.defineMetadata('stackino:ioc:inject-from', tag, target, propertyKey);
	}
}
/* eslint-enable @typescript-eslint/ban-types */
