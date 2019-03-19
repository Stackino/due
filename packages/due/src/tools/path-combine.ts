export function pathCombine(separator: string, ...args: string[]): string {
	let result = '';

	for (const arg of args) {
		const sepEnd = result.endsWith(separator);
		const sepStart = arg.startsWith(separator);

		if (sepEnd && sepStart) {
			result += arg.substr(separator.length);
		} else if (!sepEnd && !sepStart) {
			result += separator + arg;
		} else {
			result += arg;
		}
	}

	return result;
}
