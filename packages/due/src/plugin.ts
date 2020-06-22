import { ServiceProviderTag, ServiceProvider, ServiceCollection } from './ioc';

export abstract class Plugin {
	configureServices?(services: ServiceCollection): void | Promise<void>;
	onStarting?(services: ServiceProvider): void | Promise<void>;
	onStopping?(services: ServiceProvider): void | Promise<void>;
}
