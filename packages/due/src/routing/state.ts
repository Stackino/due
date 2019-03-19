import { Routable } from './routable';
import { Route } from './route';

enum StateStatus {
	pristine = 1,
	running = 2,
	executed = 3,
	finished = 4,
}

/**
 * Represents single lifecycle of a route.
 */
export class State {
	constructor(
		readonly route: Route,
		readonly page: Routable,
		private readonly mutator: (setCommitAction: (value: () => void) => void) => Promise<void>,
	) {
	}

	private status: StateStatus = StateStatus.pristine;
	private commitAction: (() => void) | null = null;

	async run(): Promise<void> {
		if (this.status !== StateStatus.pristine) {
			throw new Error('Attempt to run non-pristine state');
		}

		this.status = StateStatus.running;
		await this.mutator(
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
