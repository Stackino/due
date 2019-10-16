import { Injectable } from '../ioc';
import { action, ActionFlow, Action } from '../tools';

export abstract class Composable extends Injectable {

	protected $action<TSelf extends this, TFlow extends ActionFlow<TSelf>>(flow: TFlow): Action<TSelf, TFlow> {
		return action(this as TSelf, flow);
	}

}