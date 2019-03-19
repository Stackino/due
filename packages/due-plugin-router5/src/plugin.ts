import { BindingScope, Container, Plugin, RouterHandlerFactoryTag } from '@stackino/due';
import { Router5RouterHandlerFactory } from './router';

export class Router5Plugin implements Plugin {
	configureServices(container: Container): void {
		container.bind(RouterHandlerFactoryTag, Router5RouterHandlerFactory, BindingScope.singleton);
	}
}
