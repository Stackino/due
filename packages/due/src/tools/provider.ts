export type Provider<T> = (() => T) | (() => Promise<T>);

export async function executeProvider<T>(provider: Provider<T>): Promise<T> {
	return await provider();
}
