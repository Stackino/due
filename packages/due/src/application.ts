import { CoreApplication } from '@stackino/due-core';
import { ReactPlugin, ReactPluginOptions } from '@stackino/due-plugin-react';
import { Router5Plugin } from '@stackino/due-plugin-router5';
import { ProgressPlugin } from '@stackino/due-plugin-progress';

export abstract class Application extends CoreApplication {
	protected abstract configureReactPlugin(): ReactPluginOptions;

	protected configurePlugins() {
		const reactPlugin = new ReactPlugin(this.configureReactPlugin());
		const routerPlugin = new Router5Plugin();
		const progressPlugin = new ProgressPlugin();

		return [reactPlugin, routerPlugin, progressPlugin];
	}
}
