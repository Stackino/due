import * as React from 'react';
import { observable, runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useDependency } from './hooks';
import { ContainerTag } from '@stackino/due';
import { createObservedTemplate } from './internal/tools';

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
	let underlyingName = reactComponent.name || 'Anonymous template';
	if (underlyingName.endsWith('Component')) {
		underlyingName = underlyingName.substr(0, underlyingName.length - 9);
	}

	const connector: React.FunctionComponent<TProps> = (props: TProps) => {
		const container = useDependency(ContainerTag);
		const instanceRef = React.useRef<TReactComponent | null>(null);

		let instance = instanceRef.current;

		if (!instance) {
			instance = new reactComponent(props);

			if (!instance.template.displayName) {
				instance.template.displayName = underlyingName;
			}

			container.inject(instance);
			instanceRef.current = instance;
		}

		const ObservedComponent = createObservedTemplate('ReactComponent', instance.template);

		runInAction(() => {
			if (instance!.onUpdate) {
				instance!.onUpdate(props, instance!.props);
			}
			instance!.props = props;
		});

		return <ObservedComponent />;
	};

	if (!connector.displayName && reactComponent.name) {
		connector.displayName = `ReactComponentConnector(${underlyingName})`;
	}

	return connector;
}