import { Container } from './ioc';

export abstract class Plugin {
	configureServices?(services: Container): void | Promise<void>;
	onStarting?(services: Container): void | Promise<void>;
	onStopping?(services: Container): void | Promise<void>;
}
