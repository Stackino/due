let _counter = 0x1000;

export function getUid(): number {
	return _counter++;
}
