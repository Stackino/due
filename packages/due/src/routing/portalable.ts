export interface Portalable<TInput, TOutput> {
	enter?(input: TInput): Promise<void | (() => void)>;
	exit?(): Promise<TOutput | (() => TOutput)>;
}
