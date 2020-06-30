import { Application, Plugin } from '@stackino/due';
import { ReactPlugin, ReactPluginOptions } from '@stackino/due-plugin-react';
import { Router5Plugin } from '@stackino/due-plugin-router5';
import { ProgressPlugin } from '@stackino/due-plugin-progress';
import { Router5PluginOptions } from '@stackino/due-plugin-router5/types/plugin-options';

export abstract class ReactApplication extends Application {
	protected abstract configureReactPlugin(): ReactPluginOptions;
	protected configureRouter5Plugin?(): Router5PluginOptions;

	protected configurePlugins(): Plugin[] | Promise<Plugin[]> {
		const reactPlugin = new ReactPlugin(this.configureReactPlugin());
		const routerPlugin = new Router5Plugin(this.configureRouter5Plugin ? this.configureRouter5Plugin() : {});
		const progressPlugin = new ProgressPlugin();

		return [reactPlugin, routerPlugin, progressPlugin];
	}
}
