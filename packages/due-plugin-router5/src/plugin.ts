import { Plugin, RouterHandlerFactoryTag, ServiceCollection, Tag } from '@stackino/due';
import { Router5RouterHandlerFactory } from './router';
import { Router5PluginOptions, Router5PluginOptionsTag } from './plugin-options';

export class Router5Plugin extends Plugin {
	constructor(options: Router5PluginOptions) {
		super();

		this.options = options;
	}

	private options: Router5PluginOptions;

	configureServices(services: ServiceCollection): void | Promise<void> {
		services.bind(Router5PluginOptionsTag).toValue(this.options).inSingletonLifetime();
		services.bind(RouterHandlerFactoryTag).toClass(Router5RouterHandlerFactory).inSingletonLifetime();
	}
}
