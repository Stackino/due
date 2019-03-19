import { injectable, Tag } from '../ioc';

export const DiagnosticsServiceTag = new Tag<DiagnosticsService>('Stackino diagnostics service');

export interface DiagnosticsService {
	start(): Promise<void>;

	error(error: unknown): void;
	fatal(error: unknown): void;

	stop(): Promise<void>;
}

@injectable(DiagnosticsServiceTag)
export class DefaultDiagnosticsService implements DiagnosticsService {
	start(): Promise<void> {
		return Promise.resolve();
	}

	error(error: unknown): void {
		if (console && typeof console.error === 'function') {
			console.error('error', error);
		}
	}

	fatal(error: unknown): void {
		if (console && typeof console.error === 'function') {
			console.error('fatal', error);
		}
	}

	stop(): Promise<void> {
		return Promise.resolve();
	}
}
