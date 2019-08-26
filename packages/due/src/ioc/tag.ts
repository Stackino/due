export class Tag<T> {
	constructor(description: string) {
		this.symbol = Symbol(description);
	}

	public readonly symbol: symbol;
}
