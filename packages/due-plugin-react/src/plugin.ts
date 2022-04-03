import { Plugin, RenderServiceTag, ServiceCollection } from '@stackino/due';
import React from 'react';
import { ReactRenderService, ReactRenderServiceOptions, ReactRenderServiceOptionsTag } from './render-service';

export interface ReactPluginOptions {
	render: (app: React.ReactNode) => void;
}

export class ReactPlugin extends Plugin {
	constructor(options: ReactPluginOptions) {
		super();

		const render = options.render;
		
		if (!render) {
			throw new Error('Render is required. It must be a function accepting React.ReactNode.');
		}

		this.options = {
			render,
		};
	}

	private options: ReactRenderServiceOptions;

	configureServices(services: ServiceCollection): void | Promise<void> {
		services.bind(ReactRenderServiceOptionsTag).toValue(this.options).inSingletonLifetime();
		services.bind(RenderServiceTag).toClass(ReactRenderService).inSingletonLifetime();
	}
}
