import { getRandomString } from "./random-string";

const DEVICE_ID_KEY = 'stackino-due-devid';

export function getDeviceId(): string {
	let id = localStorage.getItem(DEVICE_ID_KEY);

	if (!id || id.length !== 64) {
		localStorage.setItem(DEVICE_ID_KEY, id = getRandomString());
	}

	return id;
}
