import * as React from 'react';
import { observable, runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useDependency } from './render-service';
import { ContainerTag } from '@stackino/due-core';

export abstract class ReactComponent<TProps> {
	constructor(props: TProps) {
		this.props = props;
	}

	@observable.ref
	props: TProps;

	onUpdate?(nextProps: TProps, prevProps: TProps): void;

	abstract template: React.FunctionComponent;
}

export function connectReactComponent<TReactComponent extends ReactComponent<TProps>, TProps>(reactComponent: new (props: TProps) => TReactComponent): React.FunctionComponent<TProps> {
	const connector: React.FunctionComponent<TProps> = (props: TProps) => {
		const container = useDependency(ContainerTag);
		const instanceRef = React.useRef<TReactComponent | null>(null);

		let instance = instanceRef.current;

		if (!instance) {
			instance = new reactComponent(props);

			if (!instance.template.displayName && reactComponent.name) {
				instance.template.displayName = reactComponent.name;
			}

			instance.template = observer(instance.template);
			container.inject(instance);
			instanceRef.current = instance;
		}

		runInAction(() => {
			if (instance!.onUpdate) {
				instance!.onUpdate(props, instance!.props);
			}
			instance!.props = props;
		});

		const Component = instance.template;
		return <Component />;
	};

	if (!connector.displayName && reactComponent.name) {
		connector.displayName = `connectReactComponent(${reactComponent.name})`;
	}

	return connector;
}