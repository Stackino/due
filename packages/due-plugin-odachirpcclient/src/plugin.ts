import { delay, Container, Plugin, Tag } from '@stackino/due-preset-react';
import { RpcClient } from '@odachi/rpc-client';

export const RpcClientTag = new Tag<RpcClient>('Odachi RpcClient');

interface OdachiRpcClientPluginOptions {
	endpoint: string;
	simulatedLatency?: number | [number, number];
}

export class OdachiRpcClientPlugin implements Plugin {
	constructor(options: OdachiRpcClientPluginOptions) {
		this.options = options;
	}

	private options: OdachiRpcClientPluginOptions;

	configureServices(container: Container): void {
		container.bindConstantValue(RpcClientTag, (() => {
			const client = new RpcClient(this.options.endpoint);

			if (this.options.simulatedLatency) {
				const latency = this.options.simulatedLatency;

				client.requestFilters.push(async (client, request) => {
					await delay(typeof latency === 'number' ? latency : Math.min(latency[0], latency[1]) + Math.floor(Math.random() * Math.abs(latency[0] - latency[1])));

					return request;
				});

				console.warn('Rpc client: Simulated latency is enabled');
			}

			return client;
		})());
	}
}
