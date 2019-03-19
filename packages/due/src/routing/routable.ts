import { Transition } from '.';

export interface Routable {
	enter?(transition: Transition): Promise<void | (() => void)>;
	retain?(transition: Transition): Promise<void | (() => void)>;
	exit?(transition: Transition): Promise<void | (() => void)>;
}
