import { Portal } from '@stackino/due';

export abstract class ReactPortal<TInput = void, TOutput = void> extends Portal<TInput, TOutput> {
	abstract template: React.FunctionComponent;
}
