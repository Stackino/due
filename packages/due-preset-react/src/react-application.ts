import { Application, Plugin } from '@stackino/due';
import { ReactPlugin, ReactPluginOptions } from '@stackino/due-plugin-react';
import { Router5Plugin } from '@stackino/due-plugin-router5';
import { ProgressPlugin } from '@stackino/due-plugin-progress';

export abstract class ReactApplication extends Application {
	protected abstract configureReactPlugin(): ReactPluginOptions;

	protected configurePlugins(): Plugin[] | Promise<Plugin[]> {
		const reactPlugin = new ReactPlugin(this.configureReactPlugin());
		const routerPlugin = new Router5Plugin();
		const progressPlugin = new ProgressPlugin();

		return [reactPlugin, routerPlugin, progressPlugin];
	}
}
