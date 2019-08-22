import { Tag } from '../ioc';
import { Portal, Transition, Routable } from '../routing';

export const RenderServiceTag = new Tag<RenderService>('Stackino render service');

export class RootPage implements Routable {
	enter = undefined;
}

export interface RenderService {
	start(): Promise<void>;
	render(transition: Transition | null, portals: readonly Portal<unknown, unknown>[]): void;
	stop(): Promise<void>;
}
