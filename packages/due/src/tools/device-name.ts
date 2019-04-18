import { UAParser } from 'ua-parser-js';

let deviceName: string | null = null;

export function getDeviceName(): string {
	if (deviceName === null) {
		const parser = new UAParser();

		deviceName = `${parser.getOS().name} ${parser.getOS().version}, ${parser.getBrowser().name} ${parser.getBrowser().version}`;
	}

	return deviceName;
};
