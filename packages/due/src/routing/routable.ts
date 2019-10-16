import { Transition } from '.';
import { Composable } from '../composition';

export abstract class Routable extends Composable {
	enter?(transition: Transition): Promise<void | (() => void)>;
	retain?(transition: Transition): Promise<void | (() => void)>;
	exit?(transition: Transition): Promise<void | (() => void)>;
}

export class NoopRoutable extends Routable {
}