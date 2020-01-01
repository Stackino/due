import { Transition } from '.';
import { Composable } from '../composition';

export abstract class Routable extends Composable {
	onEntering?(transition: Transition): void | Promise<void | (() => void)>;
	onRetaining?(transition: Transition): void | Promise<void | (() => void)>;
	onExiting?(transition: Transition): void | Promise<void | (() => void)>;
}

export class NoopRoutable extends Routable {
}