import { Injectable } from '../ioc';
import { ActionFlow, Action, action,  Reaction, reaction, Timer, timer, ActionFlowResult } from './fragments';

export abstract class Composable extends Injectable {

	protected $action<TSelf extends this, TFlow extends ActionFlow<TSelf>>(flow: TFlow): Action<TSelf, TFlow> {
		return action(this as TSelf, this.$serviceProvider, flow);
	}

	protected $timer<TSelf extends this>(timeout: number, flow: () => ActionFlowResult): Timer<TSelf> {
		return timer(this as TSelf, this.$serviceProvider, timeout, flow);
	}

	protected $reaction<TSelf extends this, TData>(expression: () => TData, flow: (data: TData) => ActionFlowResult): Reaction<TSelf, TData> {
		return reaction(this as TSelf, this.$serviceProvider, expression, flow);
	}

}