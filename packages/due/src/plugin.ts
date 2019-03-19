import { Container } from './ioc';

export interface Plugin {
	configureServices(services: Container): void;
	start?(services: Container): void | Promise<void>;
	stop?(): void | Promise<void>;
}
