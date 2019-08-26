import { Portal } from '@stackino/due';

export abstract class ReactPortal<TInput, TOutput> extends Portal<TInput, TOutput> {
	abstract template: React.FunctionComponent;
}
