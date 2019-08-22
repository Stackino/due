import { BindingScope, Container, Plugin, RouterHandlerFactoryTag } from '@stackino/due-core';
import { Router5RouterHandlerFactory } from './router';

export class Router5Plugin extends Plugin {
	configureServices(container: Container) {
		container.bind(RouterHandlerFactoryTag, Router5RouterHandlerFactory, BindingScope.singleton);
	}
}
