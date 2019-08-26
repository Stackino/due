import { Routable } from '@stackino/due';

export abstract class ReactPage extends Routable {
	abstract template: React.FunctionComponent;
}
