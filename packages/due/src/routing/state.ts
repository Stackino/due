import { ServiceProvider } from '../ioc';
import { NoopRoutable, Routable } from './routable';
import { Route } from './route';

enum StateStatus {
	pristine = 1,
	initialized = 2,
	running = 3,
	executed = 4,
	finished = 5,
}

/**
 * Represents single lifecycle of a route.
 */
export class State {
	constructor(
		readonly route: Route,
		private readonly initializer: (self: State, parent: State | null, setInstance: (instance: Routable) => void, setServiceProvider: (instance: ServiceProvider) => void) => void,
		private readonly executor: (self: State, setCommitAction: (value: () => void) => void) => Promise<void>,
	) {
	}

	instance: Routable = null!;
	serviceProvider: ServiceProvider = null!;
	private status: StateStatus = StateStatus.pristine;
	private commitAction: (() => void) | null = null;

	initialize(parent: State | null): void {
		if (this.status !== StateStatus.pristine) {
			throw new Error('Attempt to initialize non-pristine state');
		}

		this.initializer(
			this,
			parent, 
			(instance) => this.instance = instance,
			(serviceProvider) => this.serviceProvider = serviceProvider,
		);
		this.status = StateStatus.initialized;
	}

	async run(): Promise<void> {
		if (this.status !== StateStatus.initialized) {
			throw new Error('Attempt to run non-initialized state');
		}

		this.status = StateStatus.running;
		await this.executor(
			this,
			commitAction => this.commitAction = commitAction
		);
		this.status = StateStatus.executed;
	}

	commit(): void {
		if (this.status !== StateStatus.executed) {
			throw new Error('Attempt to commit non-executed state');
		}

		if (this.commitAction) {
			this.commitAction();
		}

		this.status = StateStatus.finished;
	}
}
