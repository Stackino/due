import { Tag } from '../ioc';
import { Portalable, Transition } from '../routing';

export const RenderServiceTag = new Tag<RenderService>('Stackino render service');

export const RootPageComponent = Symbol('Stackino root page component');

export interface RenderService {
	start(): Promise<void>;
	render(transition: Transition | null, portals: ReadonlyArray<Portalable<unknown, unknown>>): void;
	stop(): Promise<void>;
}
