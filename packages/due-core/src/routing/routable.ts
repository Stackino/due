import { Transition } from '.';

export abstract class Routable {
	enter?(transition: Transition): Promise<void | (() => void)>;
	retain?(transition: Transition): Promise<void | (() => void)>;
	exit?(transition: Transition): Promise<void | (() => void)>;
}
