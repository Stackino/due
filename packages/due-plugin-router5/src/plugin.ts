import { Plugin, RouterHandlerFactoryTag, ServiceCollection } from '@stackino/due';
import { Router5RouterHandlerFactory } from './router';

export class Router5Plugin extends Plugin {
	configureServices(services: ServiceCollection): void | Promise<void> {
		services.bind(RouterHandlerFactoryTag).toClass(Router5RouterHandlerFactory).inSingletonLifetime();
	}
}
