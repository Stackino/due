import { BindingScope, Container, Plugin, RouterHandlerFactoryTag } from '@stackino/due';
import { Router5RouterHandlerFactory } from './router';

export class Router5Plugin extends Plugin {
	configureServices(container: Container): void | Promise<void> {
		container.bind(RouterHandlerFactoryTag, Router5RouterHandlerFactory, BindingScope.singleton);
	}
}
