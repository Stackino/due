import { Routable } from '@stackino/due';
import * as React from 'react';
import { View } from '.';

export abstract class ReactPage extends Routable {
	abstract template: React.FunctionComponent;
}
